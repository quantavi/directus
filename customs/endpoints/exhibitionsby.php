<?php

use Directus\Bootstrap;
use Directus\View\JsonView;

// Slim App
$app = Bootstrap::get('app');

// Simple GET endpoint example
$app->get('/exhibitionsby', function () use ($app) {
    
//     $museum_id = $app->request()->params('museum_id');
    
    return JsonView::render([
        'param' => $_GET
    ]);
});
