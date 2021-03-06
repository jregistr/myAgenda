<?php

namespace App\Models;

use App\Util\C;

/**
 * @property integer id
 * @property integer section_id
 * @property integer student_id
 * @property string category
 * @property float points
 */
class Weight extends BaseModel
{
    public $timestamps = false;

    protected $fillable = [
        C::CATEGORY,
        C::POINTS,
        C::STUDENT_ID,
        C::SECTION_ID
    ];

    public function grades()
    {
        return $this->hasMany(Grade::class);
    }

    public static function getWithGrades($studentId, $sectionId)
    {
        $weightsRaw = Weight::where([['student_id', '=', $studentId],
            ['section_id', '=', $sectionId]])->get();
        $weights = $weightsRaw->count() > 0 ? $weightsRaw : null;

        if ($weights) {
            foreach ($weights as $weight) {
                $weight->grades = $weight->grades()->get();
            }
            return $weights;
        }

        return [];
    }

}
