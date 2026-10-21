<?php
declare(strict_types=1);

const GUARDIAN_APPLICATION_EMAIL = 'info@guardianangelcareohio.com';
const MAX_APPLICATION_BYTES = 10485760;

header('Content-Type: application/json');

function send_json(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function clean_header_value(string $value): string
{
    return trim(str_replace(["\r", "\n"], ' ', $value));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(405, ['ok' => false, 'message' => 'Method not allowed.']);
}

if (!isset($_FILES['applicationPdf'])) {
    send_json(400, ['ok' => false, 'message' => 'Application PDF is required.']);
}

$uploadedFile = $_FILES['applicationPdf'];

if (!is_array($uploadedFile) || (int) $uploadedFile['error'] !== UPLOAD_ERR_OK) {
    send_json(400, ['ok' => false, 'message' => 'Application upload failed.']);
}

if ((int) $uploadedFile['size'] <= 0 || (int) $uploadedFile['size'] > MAX_APPLICATION_BYTES) {
    send_json(400, ['ok' => false, 'message' => 'Application PDF size is invalid.']);
}

$pdfBytes = file_get_contents((string) $uploadedFile['tmp_name']);

if ($pdfBytes === false || $pdfBytes === '') {
    send_json(400, ['ok' => false, 'message' => 'Application PDF could not be read.']);
}

$applicantName = clean_header_value((string) ($_POST['applicantName'] ?? 'Applicant'));
$applicantPhone = clean_header_value((string) ($_POST['applicantPhone'] ?? 'Not provided'));
$position = clean_header_value((string) ($_POST['position'] ?? 'Not provided'));
$safeApplicantName = preg_replace('/[^A-Za-z0-9 ._-]/', '', $applicantName) ?: 'Applicant';
$subject = 'Guardian Angel Employment Application - ' . $safeApplicantName;
$fileName = basename((string) ($uploadedFile['name'] ?? 'employment-application.pdf'));
$fileName = preg_replace('/[^A-Za-z0-9._-]/', '_', $fileName) ?: 'employment-application.pdf';

$lowerFileName = strtolower($fileName);

if (substr($lowerFileName, -4) !== '.pdf') {
    $fileName .= '.pdf';
}

$boundary = '=_GuardianApplication_' . bin2hex(random_bytes(16));
$bodyText = implode("\r\n", [
    'A completed Guardian Angel employment application was submitted from the website.',
    '',
    'Applicant: ' . ($safeApplicantName ?: 'Applicant'),
    'Phone: ' . ($applicantPhone ?: 'Not provided'),
    'Position: ' . ($position ?: 'Not provided'),
    '',
    'The completed PDF is attached.',
]);

$message = '--' . $boundary . "\r\n";
$message .= "Content-Type: text/plain; charset=UTF-8\r\n";
$message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
$message .= $bodyText . "\r\n\r\n";
$message .= '--' . $boundary . "\r\n";
$message .= 'Content-Type: application/pdf; name="' . $fileName . '"' . "\r\n";
$message .= "Content-Transfer-Encoding: base64\r\n";
$message .= 'Content-Disposition: attachment; filename="' . $fileName . '"' . "\r\n\r\n";
$message .= chunk_split(base64_encode($pdfBytes)) . "\r\n";
$message .= '--' . $boundary . "--\r\n";

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: multipart/mixed; boundary="' . $boundary . '"',
    'From: Guardian Angel Website <no-reply@guardianangelcareohio.com>',
    'Reply-To: ' . GUARDIAN_APPLICATION_EMAIL,
    'X-Mailer: PHP/' . phpversion(),
];

$sent = mail(GUARDIAN_APPLICATION_EMAIL, $subject, $message, implode("\r\n", $headers));

if (!$sent) {
    send_json(500, ['ok' => false, 'message' => 'Email could not be sent by the server.']);
}

send_json(200, ['ok' => true, 'message' => 'Application sent.']);
