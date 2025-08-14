<?php
// Revolt Bot Yönlendirme Script'i
header('Content-Type: text/html; charset=utf-8');

// Port 3000'de çalışan uygulamaya yönlendir
$target_url = 'http://localhost:3000' . $_SERVER['REQUEST_URI'];

// Eğer localhost çalışmazsa, IP ile dene
if (!@file_get_contents('http://localhost:3000/')) {
    $target_url = 'http://127.0.0.1:3000' . $_SERVER['REQUEST_URI'];
}

// Yönlendirme yap
header("Location: $target_url", true, 302);
exit();
?>
