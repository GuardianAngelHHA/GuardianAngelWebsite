<?php
declare(strict_types=1);

require_once __DIR__ . '/private-submission-lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    private_submission_json(405, ['ok' => false, 'message' => 'Method not allowed.']);
}

if (!private_submission_is_https()) {
    private_submission_json(403, ['ok' => false, 'message' => 'Secure HTTPS submission is required. Open the website using https:// and try again.']);
}

if (!isset($_FILES['applicationPdf']) || !is_array($_FILES['applicationPdf'])) {
    private_submission_json(400, ['ok' => false, 'message' => 'The completed application PDF is required.']);
}

$submission = null;

try {
    $submission = create_private_submission_directory('application');
    store_private_pdf($_FILES['applicationPdf'], $submission['directory'], 'employment-application.pdf');
} catch (Throwable $error) {
    if ($submission !== null) {
        remove_private_submission_directory($submission['directory']);
    }

    private_submission_json(400, ['ok' => false, 'message' => $error->getMessage()]);
}

$notificationSent = notify_private_submission('application', $submission['reference']);

private_submission_json(200, [
    'ok' => true,
    'reference' => $submission['reference'],
    'notificationSent' => $notificationSent,
]);
