<?php

namespace App\Models;

use App\Util\C;

/**
 * Class GeneratorList
 * @package App\Models
 * @property int id
 * @property int student_id
 * @property int credit_limit
 */
class GeneratorList extends BaseModel
{

    public $timestamps = false;
    protected $fillable = [
        C::STUDENT_ID,
        C::CREDIT_LIMIT
    ];

    public function entries()
    {

    }

}
