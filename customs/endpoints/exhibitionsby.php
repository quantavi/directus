<?php

use Directus\Bootstrap;
use Directus\Database\TableGatewayFactory;
use Directus\View\JsonView;

// Slim App
$app = Bootstrap::get('app');

// Simple GET endpoint example
$app->get('/exhibitionsby', function () use ($app) {
    
    $museum_id = $app->request()->params('museum');
    
//     $requestPayload = $app->request()->get();
//     $museum_id = ArrayUtils::get($requestPayload, 'museum');
    
    $junctionTable = TableGatewayFactory::create('junction_exhibition_to_museum');
    
    return JsonView::render([
        'GET params' => $_GET,
        'museum' => $museum_id,
        'junction' => $junctionTable->getItems([ 
            'status' => [2]
        ])['data']
    ]);
});
