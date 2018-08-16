<?php

use Directus\Bootstrap;
use Directus\View\JsonView;

// Slim App
$app = Bootstrap::get('app');

// Simple GET endpoint example
$app->get('/exhibitionsByMID', function () {
    return JsonView::render([
        'item 1',
        'item 2'
    ]);
});
