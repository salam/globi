<?php
/**
 * Newsletter subscription endpoint.
 * Stores emails in a local SQLite database (../data/subscribers.db).
 * The data/ directory is protected from direct access via .htaccess.
 *
 * POST /api/subscribe.php
 * Body: JSON { "email": "user@example.com" }
 * Response: JSON { "ok": true, "message": "..." }
 */

header('Content-Type: application/json; charset=utf-8');

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

// Parse JSON body
$input = json_decode(file_get_contents('php://input'), true);
$email = isset($input['email']) ? trim($input['email']) : '';

// Validate email
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid email address']);
    exit;
}

// Rate limit: max 10 subscriptions per IP per hour (simple in-memory via SQLite)
$dbDir = __DIR__ . '/../data';
if (!is_dir($dbDir)) {
    mkdir($dbDir, 0750, true);
}

$dbPath = $dbDir . '/subscribers.db';

try {
    $db = new SQLite3($dbPath);
    $db->busyTimeout(3000);
    $db->exec('PRAGMA journal_mode=WAL');

    // Create table if not exists
    $db->exec('CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        ip TEXT,
        subscribed_at TEXT NOT NULL DEFAULT (datetime(\'now\')),
        confirmed INTEGER NOT NULL DEFAULT 0
    )');

    // Rate limit table
    $db->exec('CREATE TABLE IF NOT EXISTS rate_limits (
        ip TEXT NOT NULL,
        attempted_at TEXT NOT NULL DEFAULT (datetime(\'now\'))
    )');

    // Clean up old rate limit entries (older than 1 hour)
    $db->exec("DELETE FROM rate_limits WHERE attempted_at < datetime('now', '-1 hour')");

    // Check rate limit
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $stmt = $db->prepare('SELECT COUNT(*) as cnt FROM rate_limits WHERE ip = :ip');
    $stmt->bindValue(':ip', $ip, SQLITE3_TEXT);
    $result = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

    if ($result['cnt'] >= 10) {
        http_response_code(429);
        echo json_encode(['ok' => false, 'message' => 'Too many requests. Try again later.']);
        $db->close();
        exit;
    }

    // Record this attempt
    $stmt = $db->prepare('INSERT INTO rate_limits (ip) VALUES (:ip)');
    $stmt->bindValue(':ip', $ip, SQLITE3_TEXT);
    $stmt->execute();

    // Check if already subscribed
    $stmt = $db->prepare('SELECT id FROM subscribers WHERE email = :email');
    $stmt->bindValue(':email', $email, SQLITE3_TEXT);
    $existing = $stmt->execute()->fetchArray();

    if ($existing) {
        echo json_encode(['ok' => true, 'message' => 'already_subscribed']);
        $db->close();
        exit;
    }

    // Insert new subscriber
    $stmt = $db->prepare('INSERT INTO subscribers (email, ip) VALUES (:email, :ip)');
    $stmt->bindValue(':email', $email, SQLITE3_TEXT);
    $stmt->bindValue(':ip', $ip, SQLITE3_TEXT);
    $stmt->execute();

    echo json_encode(['ok' => true, 'message' => 'subscribed']);
    $db->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Server error. Please try again later.']);
}
