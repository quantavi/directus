<?php

use Directus\Bootstrap;
use Directus\View\JsonView;

// Slim App
$app = Bootstrap::get('app');

function makeSureExist( $path ) {
    if ( !file_exists( $path ) ) {
        mkdir( $path, 0755, true );
    }
}

function getExampleData( $type ) {
    switch ( $type ) {
        case 'array_of_objects':
            return [
                [
                    'title' => 'Example File Title 1',
                    'name' => 'exampleFileName01.jpg',
                    'ratio' => 'Free',
                    'dir' => 'free',
                    'encoded' => 'file encoded in base64'
                ],
                [
                    'title' => 'Example File Title 2',
                    'name' => 'exampleFileName02.png',
                    'ratio' => '16:9',
                    'dir' => 'sixteen_nine',
                    'encoded' => 'file encoded in base64'
                ]
            ];
        case 'file':
            return [
                    'title' => 'Example File Title 1',
                    'name' => 'exampleFileName01.jpg',
                    'ratio' => 'Free',
                    'dir' => 'free',
                    'encoded' => 'file encoded in base64'
                ];
    }
    
}

$app->post('/ratios', function () {
    // Get all cropped images and save it as PHP object
    $data = json_decode($_POST['data']);
    
    // Check if the data is null
    if ( is_null($data) ) {
        return JsonView::render([
            'error_message' => 'data is null, probably variable hasn\'t been initialized'
        ]);
    }
    
    // Check if the data is empty
    if ( empty($data) ) {
        return JsonView::render([
            'error_message' => 'data is empty!'
        ]);
    }
    
    // Check that the data is in the correct format || Check if the data is an array of objects
    if ( !is_array($data) ) {
        return JsonView::render([
            'error_message' => 'data should be an array of objects!',
            'given_data_type' => gettype($data),
            'hint' => 'try using \'JSON.stringify()\' if you are using JavaScript',
            'should_be' => getExampleData('array_of_objects')
        ]);
    }
    
    // Variables for Creating and Saving files
    $succeed = []; 
    $failed = [];
    $config = Bootstrap::get('config');
    $fileSystem = $config['filesystem'];
    $root = $fileSystem['root'];
    $ratiosPath = $root.'/ratios';
    
    // Create and Save file
    foreach ( $data as $f ) {
        // Check if the item is an object
        if ( !is_object($f) ) {
            $failed[$f] = [
                'error_message' => 'file should be an object!',
                'given_file_type' => gettype($f),
                'given_file' => $f,
                'should_be' => getExampleData('file')
            ];
            continue;
        }
        
        // Check if the required folder exists, create it if not
        makeSureExist( $ratiosPath.'/'.$f->dir );
        
        // Path & Title
        $path = $ratiosPath.'/'.$f->dir.'/'.$f->name;
        
        // Image
        $image_data = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $f->encoded));

        // Save image to it's directory and save result of the operation to the variable $succeed
        $success = ( file_put_contents($path, $image_data) !== false ) ? true : false;
        
        // Prepare result
        $succeed[$f->dir] = [
            'success' => $success,
            'path' => $path
        ];
    }
    
    // TMP -> TEST
    $time = new DateTime();
    $format = 'Y-m-d H:i:s';

    // JSON response
    return JsonView::render([
        'date_time' => $time->format($format),
        'data' => $data,
        'succeed' => $succeed,
        'failed' => $failed
    ]);
});