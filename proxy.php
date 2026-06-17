<?php
// proxy.php - A secure proxy to hide your API Key
$apiKey = 'e113279daa094cf29e24802ff56566e2'; 
$symbol = $_GET['symbol'] ?? 'AAPL';
$interval = $_GET['interval'] ?? ''; // Interval only needed for time_series
$outputsize = $_GET['outputsize'] ?? '';

// Determine if we need time_series or price
if (!empty($interval)) {
    $url = "https://api.twelvedata.com/time_series?symbol=$symbol&interval=$interval&outputsize=$outputsize&apikey=$apiKey";
} else {
    $url = "https://api.twelvedata.com/price?symbol=$symbol&apikey=$apiKey";
}

$response = file_get_contents($url);

header('Content-Type: application/json');
echo $response;
?>
