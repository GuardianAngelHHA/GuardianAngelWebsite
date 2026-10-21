<?php
declare(strict_types=1);

const PRIVATE_SUBMISSIONS_EMAIL = 'info@guardianangelcareohio.com';
const PRIVATE_SUBMISSIONS_MAX_FILE_BYTES = 10485760;

function private_submission_json(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    echo json_encode($payload);
    exit;
}

function private_submission_is_https(): bool
{
    $https = strtolower((string) ($_SERVER['HTTPS'] ?? ''));

    return in_array($https, ['on', '1'], true) || (int) ($_SERVER['SERVER_PORT'] ?? 0) === 443;
}

function create_private_submission_directory(string $type): array
{
    $root = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'private-employee-submissions';

    if (!is_dir($root) && !@mkdir($root, 0700, true) && !is_dir($root)) {
        throw new RuntimeException('Private storage is unavailable.');
    }

    @chmod($root, 0700);

    for ($attempt = 0; $attempt < 3; $attempt++) {
        $reference = bin2hex(random_bytes(16));
        $directory = $root . DIRECTORY_SEPARATOR . $type . '-' . $reference;

        if (@mkdir($directory, 0700)) {
            @chmod($directory, 0700);
            return ['reference' => $reference, 'directory' => $directory];
        }
    }

    throw new RuntimeException('Private storage is unavailable.');
}

function store_private_pdf(array $upload, string $directory, string $destinationName): void
{
    if (!isset($upload['error'], $upload['size'], $upload['tmp_name']) || !is_string($upload['tmp_name'])) {
        throw new RuntimeException('A required PDF is missing.');
    }

    if ((int) $upload['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('A PDF could not be uploaded. Check the file size and try again.');
    }

    if ((int) $upload['size'] <= 0 || (int) $upload['size'] > PRIVATE_SUBMISSIONS_MAX_FILE_BYTES) {
        throw new RuntimeException('Each PDF must be 10 MB or smaller.');
    }

    if (!is_uploaded_file($upload['tmp_name'])) {
        throw new RuntimeException('A PDF could not be verified.');
    }

    $fileInfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $fileInfo->file($upload['tmp_name']);
    $signature = file_get_contents($upload['tmp_name'], false, null, 0, 5);

    if ($mimeType !== 'application/pdf' || $signature !== '%PDF-') {
        throw new RuntimeException('Only completed PDF files can be submitted.');
    }

    $destination = $directory . DIRECTORY_SEPARATOR . $destinationName;

    if (!move_uploaded_file($upload['tmp_name'], $destination)) {
        throw new RuntimeException('A PDF could not be saved. Please try again.');
    }

    @chmod($destination, 0600);
}

function remove_private_submission_directory(string $directory): void
{
    if (!is_dir($directory)) {
        return;
    }

    foreach (scandir($directory) ?: [] as $entry) {
        if ($entry === '.' || $entry === '..') {
            continue;
        }

        $path = $directory . DIRECTORY_SEPARATOR . $entry;
        if (is_file($path)) {
            @unlink($path);
        }
    }

    @rmdir($directory);
}

function notify_private_submission(string $type, string $reference): bool
{
    $subject = 'New employee ' . $type . ' submission received';
    $body = implode("\r\n", [
        'A new employee submission is stored in the private cPanel account folder outside public_html.',
        'Submission type: ' . $type,
        'Reference: ' . $reference,
        '',
        'Retrieve it through cPanel File Manager from the private-employee-submissions folder in the account home directory.',
        'Do not move these files into the public website folder or forward them by regular email.',
    ]);
    $headers = [
        'From: Guardian Angel Website <no-reply@guardianangelcareohio.com>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
    ];

    return @mail(PRIVATE_SUBMISSIONS_EMAIL, $subject, $body, implode("\r\n", $headers));
}
