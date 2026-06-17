<?php
// proxy.php - A secure proxy to hide your API Key
$apiKey = 'e113279daa094cf29e24802ff56566e2'; 
$symbol = $_GET['symbol'] ?? 'AAPL';
$interval = $_GET['interval'] ?? '1min';
$outputsize = $_GET['outputsize'] ?? '100';

$url = "https://api.twelvedata.com/time_series?symbol=$symbol&interval=$interval&outputsize=$outputsize&apikey=$apiKey";

$response = file_get_contents($url);

header('Content-Type: application/json');
echo $response;
?>

