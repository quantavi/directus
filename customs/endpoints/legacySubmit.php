<?php

use Directus\Bootstrap;
use Directus\View\JsonView;

// Slim App
$app = Bootstrap::get('app');

// System Arrays
$server_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]";
$ignore = ["directus_files"];

// Debug Arrays
$childs_inheriting = [];
$childs_data = [];
$childs = [];
$stack = [];
$fuck_it = [];
$is_not_an_object = [];

function getItem($table, $id = null, $token, $args = null) {
    global $server_url;
    $url = $server_url.DIRECTUS_PATH.$table."/rows/".$id."?preview=1&access_token=".$token.$args;
    
    $curl = curl_init($url);
    curl_setopt($curl, CURLOPT_TIMEOUT, 3);
    curl_setopt($curl, CURLOPT_HTTPGET, 1);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
    
    $result = curl_exec($curl);
    curl_close($curl);
    
    return $result;
}

function updateItem($table, $id, $data, $token) {
    global $server_url;
    $url = $server_url.DIRECTUS_PATH."/api/1.1/tables/".$table."/rows/".$id."?access_token=".$token;
    
    $curl = curl_init($url);
    curl_setopt($curl, CURLOPT_CUSTOMREQUEST, "PUT");
    curl_setopt($curl, CURLOPT_TIMEOUT, 3);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($data));
    
    $result = curl_exec($curl);
    curl_close($curl);
    
    return $result;
}

function getPosition($table, $token) {
    $directus_columns = json_decode(getItem("/api/1.1/tables/directus_columns", null, $token, "&filters[table_name]=$table&filters[column_name]=status"));
    foreach ($directus_columns->data as $item) {
        if (isset($item->options)) {
            return json_decode($item->options)->position;
        }
    }
    return "999";
}

function submitLegacy($root_item, $root_position, $data) {
    global $childs_inheriting, $childs_data, $childs, $ignore, $stack, $fuck_it, $is_not_an_object;
    // Debug 0
    if ($data->debug) array_push($stack, $root_item);
    
    if (!is_object($root_item)) {
        array_push($is_not_an_object, $root_item);
        return;
    }
    // 0
    foreach ($root_item->data as $child) {
        // 1
        if (is_object($child)) {
            // Debug 1
            if ($data->debug) array_push($childs_inheriting, $child);
            // If data of the child is an object
            if (is_object($child->data)) {
                // Child data
                $id = $child->data->id;
                $status = $child->data->status;
                $table = $child->meta->table;
                $position = getPosition($table, $data->token);
                // 2
                if ($position > $root_position && $status != $data->status && !in_array($table, $ignore)) {
                    // Debug 2
                    if ($data->debug) {
                        array_push($childs_data, [
                            'id' => $id,
                            'status' => $status,
                            'table' => $table,
                            'position' => $position
                        ]);
                    }
                    // Data to update
                    $update = [
                        'status' => $data->status
                    ];
                    // Update child and get their childs
                    $itsChilds = json_decode(updateItem($table, $id, $update, $data->token));
                    // Debug 3
                    array_push($childs, $itsChilds);
                    // Repeat or die
                    submitLegacy($itsChilds, $position, $data);
                }
            } else {
                // Global data
                $table = $child->meta->table;
                $position = getPosition($table, $data->token);
                // 2`
                foreach ($child->data as $item) {
                    // Item data
                    $id = $item->id;
                    $status = $item ->status;
                    // 3
                    if ($position > $root_position && $status != $data->status && !in_array($table, $ignore)) {
                        // Debug 2
                        if ($data->debug) {
                            array_push($childs_data, [
                                'id' => $id,
                                'status' => $status,
                                'table' => $table,
                                'position' => $position
                            ]);
                        }
                        // Data to update
                        $update = [
                            'status' => $data->status
                        ];
                        // Update child and get their childs
                        $itsChilds = json_decode(updateItem($table, $id, $update, $data->token));
                        // Debug 3
                        array_push($childs, $itsChilds);
                        // Repeat or die
                        submitLegacy($itsChilds, $position, $data);
                    }
                }
            }
        } else {
            array_push($fuck_it, $child);
        }
    }
}

$app->post('/legacySubmit', function () {
    global $server_url, $childs_inheriting, $childs_data, $childs, $ignore, $stack, $fuck_it, $is_not_an_object;
    // Get root data
    $data = json_decode($_POST['data']);
    // Get root table, id, position and token
    $root_table = $data->table;
    $root_id = $data->rid;
    $root_position = $data->position;
    $token = $data->token;
    // TMP -> TEST
    $time = new DateTime();
    $format = 'Y-m-d H:i:s';
    // Get root item
    $root_item = json_decode(getItem($root_table, $root_id, $token)); 
    // Transfer the status to all children recursively
    submitLegacy($root_item, $root_position, $data);
    // If debug mode is enabled return more data about what's goind on
    if ($data->debug) {
        // JSON response
        return JsonView::render([
            'date_time' => $time->format($format),
            'data' => $data,
            'start_data' => $root_item,
            'childs_updated' => $childs,
            'childs_inheriting_data' => $childs_data,
            'childs_available' => $childs_inheriting,
            'stack' => $stack,
            'fuck_it' => $fuck_it,
            'is_not_an_object' => $is_not_an_object
        ]);
    } else {
        // JSON response
        return JsonView::render([
            'childs_updated' => $childs
        ]);
    }
});