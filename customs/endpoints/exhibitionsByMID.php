<?php

use Directus\Bootstrap;
use Directus\View\JsonView;

// Slim App
$app = Bootstrap::get('app');

// Simple GET endpoint example
$app->get('/exhibitionsByMID', function () use ($app) {
    
    $paramValue = $app->request()->params('paramName');
    
    return JsonView::render([
        'params' => $paramValue
    ]);
});
