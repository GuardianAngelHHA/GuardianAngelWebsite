<?php
declare(strict_types=1);

require_once __DIR__ . '/private-submission-lib.php';

const ONBOARDING_MAX_TOTAL_BYTES = 26214400;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    private_submission_json(405, ['ok' => false, 'message' => 'Method not allowed.']);
}

if (!private_submission_is_https()) {
    private_submission_json(403, ['ok' => false, 'message' => 'Secure HTTPS submission is required. Open the website using https:// and try again.']);
}

$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > ONBOARDING_MAX_TOTAL_BYTES + 1048576) {
    private_submission_json(413, ['ok' => false, 'message' => 'The combined PDF files must be no larger than 25 MB.']);
}

if (empty($_POST['offerAccepted'])) {
    private_submission_json(400, ['ok' => false, 'message' => 'Confirm that you accepted a job offer before submitting onboarding forms.']);
}

$requiredFiles = [
    'w4Pdf' => 'w-4.pdf',
    'i9Pdf' => 'i-9.pdf',
    'it4Pdf' => 'ohio-it-4.pdf',
];

$totalBytes = 0;
foreach ($requiredFiles as $field => $_fileName) {
    if (!isset($_FILES[$field]) || !is_array($_FILES[$field])) {
        private_submission_json(400, ['ok' => false, 'message' => 'Please attach the completed W-4, I-9, and IT 4 PDFs.']);
    }

    $totalBytes += (int) ($_FILES[$field]['size'] ?? 0);
}

if ($totalBytes > ONBOARDING_MAX_TOTAL_BYTES) {
    private_submission_json(413, ['ok' => false, 'message' => 'The combined PDF files must be no larger than 25 MB.']);
}

$submission = null;

try {
    $submission = create_private_submission_directory('onboarding');
    foreach ($requiredFiles as $field => $fileName) {
        store_private_pdf($_FILES[$field], $submission['directory'], $fileName);
    }
} catch (Throwable $error) {
    if ($submission !== null) {
        remove_private_submission_directory($submission['directory']);
    }

    private_submission_json(400, ['ok' => false, 'message' => $error->getMessage()]);
}

$notificationSent = notify_private_submission('onboarding forms', $submission['reference']);

private_submission_json(200, [
    'ok' => true,
    'reference' => $submission['reference'],
    'notificationSent' => $notificationSent,
]);
