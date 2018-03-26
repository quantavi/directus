<?php

use Directus\Bootstrap;

use Directus\Application\Route;
use Directus\Database\TableGateway\RelationalTableGateway as TableGateway;
use Directus\Util\ArrayUtils;
use Directus\Util\DateUtils;
use Directus\Util\StringUtils;
use Directus\View\JsonView;
use Zend\Db\Sql\Ddl\Column\Date;
use Directus\Filesystem\Files as Files;

// Slim App
$app = Bootstrap::get('app');

// Simple POST endpoint example

/* $app->post('/ratios/:test', function ($test = null) {
    $time = new DateTime();
    $format = 'Y-m-d H:i:s';
    return JsonView::render([
        'date_time' => $time->format($format),
        'test' => $test
    ]);
});
 */

$app->post('/ratios', function () {
    // Get all cropped images and save it as PHP object
    $data = json_decode($_POST['data']);
    
    // Variables for Creating and Saving files
    $success = [];
    $config = Bootstrap::get('config');
    $fileSystem = $config['filesystem'];
    $root = $fileSystem['root'];
    
    // Create and Save file
    foreach ( $data as $f ) {
        // Path & Title
        $path = $root.'/ratios/'.$f->dir.'/'.$f->name;
        
        // Image
        $image_data = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $f->encoded));

        // Save image to it's directory and save result of the operation to the variable $succeed
        $succeed = ( file_put_contents($path, $image_data) !== false ) ? true : false;
        
        // Prepare result
        $success[$f->dir] = [
            'succeed' => $succeed,
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
        'success' => $success
    ]);
});