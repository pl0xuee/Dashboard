<?php
// Securely store your API Key here
$apiKey = 'e113279daa094cf29e24802ff56566e2';

// Get parameters from the request
$symbol = isset($_GET['symbol']) ? $_GET['symbol'] : 'AAPL';
$type = isset($_GET['type']) ? $_GET['type'] : 'time_series';
$interval = isset($_GET['interval']) ? $_GET['interval'] : '1min';
$outputsize = isset($_GET['outputsize']) ? $_GET['outputsize'] : '100';

// Construct the URL
if ($type == 'price') {
    $url = "https://api.twelvedata.com/price?symbol=$symbol&apikey=$apiKey";
} else {
    $url = "https://api.twelvedata.com/time_series?symbol=$symbol&interval=$interval&outputsize=$outputsize&apikey=$apiKey";
}

// Fetch the data
$data = file_get_contents($url);

// Return the result
header('Content-Type: application/json');
echo $data;
?>
