import {AddCourseComponent} from './addcourse';
import {GeneratorEntry, GeneratorList, Meeting, ScheduledCourse, Section} from "../data/interfaces";
import {headers} from "../common/functions";
import * as moment from 'moment';
import {renderMeetDaysDisplay} from "./renderMeetDisplay";
import {Component} from "../data/component";

export class GeneratorListComponent implements Component {

    parent: JQuery;
    private genListTable: JQuery;
    private addNewBtn: JQuery;
    private clearBtn: JQuery;
    private courseInfoModal: JQuery;
    private confirmModal: JQuery;
    private creditLimitDisplay: JQuery;

    constructor(parent: JQuery, genListTable: JQuery, creditLimParent: JQuery, addNewBtn: JQuery, clearBtn: JQuery,
                genBtn: JQuery, courseInfoModal: JQuery, confirmModal: JQuery, onGenerateClicked: () => void) {
        this.parent = parent;
        this.genListTable = genListTable;
        this.addNewBtn = addNewBtn;
        this.clearBtn = clearBtn;
        this.courseInfoModal = courseInfoModal;
        this.confirmModal = confirmModal;

        confirmModal.find('button[class="btn btn-danger"]').on('click', this.clearBtnClicked.bind(this));

        this.clearBtn.on('click', () => {
            confirmModal.modal('show');
        });
        this.addNewBtn.on('click', this.showAddCourseToGeneratorForm.bind(this));
        genBtn.on('click', onGenerateClicked);

        this.makeCreditLimitSection(creditLimParent);
        const self = this;
        GeneratorListComponent.getGeneratorList((list: GeneratorList) => {
            self.renderGenerator(list);
        });
    }

    public addToGenList(scheduledCourse: ScheduledCourse) {
        this.updateQuery('PUT', {
            section_id: scheduledCourse.section.id,
            meeting_id: scheduledCourse.section.meeting.id
        });
    }

    render(): void {
        this.parent.show();
    }

    hide(): void {
        this.parent.hide();
    }

    private makeCreditLimitSection(parent: JQuery): void {
        const self = this;
        parent.append($(`<span class="input-group-addon"><span>Credit Limit</span></span>`));
        const creditLimitInput = $(`<input type="number" min="0" class="form-control disabled" name="" 
            placeholder="i.e: 17">`);
        creditLimitInput.hide();
        const creditLimitText = this.creditLimitDisplay = $(`<span class="form-control"></span>`);
        parent.append(this.creditLimitDisplay);
        parent.append(creditLimitText);
        parent.append(creditLimitInput);
        const hide = $(`<div class="hidden"></div>`);
        parent.append(hide);

        const inputGroup = $(`<div class="input-group-btn"></div>`);
        const edit = $(`
            <button class="btn btn-default" type="submit">
                 <span class="glyphicon glyphicon-pencil"></span>
            </button>
        `);
        const save = $(`
            <button class="btn btn-default" type="submit">
                 <span class="glyphicon glyphicon-floppy-save"></span>
            </button>
        `);
        const cancel = $(`
            <button class="btn btn-default" type="submit">
                 <span class="glyphicon glyphicon-remove"></span>
            </button>
        `);

        inputGroup.append(edit);
        hide.append(save);
        hide.append(cancel);
        parent.append(inputGroup);

        function switchOut() {
            hide.append(save)
                .append(cancel);
            inputGroup.append(edit);
            creditLimitText.show();
            creditLimitInput.val('');
            creditLimitInput.hide();
        }

        edit.on('click', () => {
            hide.append(edit);
            inputGroup.append(save)
                .append(cancel);
            creditLimitText.hide();
            creditLimitInput.show();
        });

        cancel.on('click', () => {
            switchOut();
        });

        save.on('click', () => {
            const t = creditLimitInput.val();
            creditLimitText.text('');
            if (t.length > 0 && !isNaN(t)) {
                self.updateGeneratorCreditLimit(parseInt(t)).then(value => {
                    self.setCreditDisplay(value);
                }, reason => {
                    self.setCreditDisplay(17);
                });
            } else {
                creditLimitText.text(t);
            }
            switchOut();
        });

    }

    private updateGeneratorCreditLimit(creditLimit: number): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            $.ajax({
                url: '/api/schedule/generator',
                method: 'POST',
                headers,
                data: {
                    credit_limit: creditLimit
                },
                success(resp: JQueryAjaxSettings) {
                    const data = resp.data;
                    const credit = data.credit_limit;
                    resolve(credit);
                },
                error(xhr, status) {
                    reject(status);
                }
            })
        });
    }

    private setCreditDisplay(credits: number): void {
        this.creditLimitDisplay.empty();
        this.creditLimitDisplay.append($(`<span>${credits}</span>`));
    }

    private showAddCourseToGeneratorForm(): void {
        const title = this.courseInfoModal.find('h4[class="modal-title"]');
        const mBody = this.courseInfoModal.find('div[class="modal-body"]');
        const self = this;
        mBody.empty();
        title.empty();
        title.append('Add to Generate List');
        new AddCourseComponent(mBody, (course, sections) => {
            if (sections.length > 0) {
                const s = sections[0];
                const scheduledSection = {
                    id: s.id,
                    course_id: s.course_id,
                    instructors: s.instructors,
                    meeting: s.meetings[0]
                };

                const scheduledCourse: ScheduledCourse = {
                    id: course.id,
                    name: course.name,
                    crn: course.crn,
                    credits: course.credits,
                    school_id: course.school_id,
                    section: scheduledSection
                };
                self.courseInfoModal.modal('hide');
                this.addToGeneratorList(scheduledCourse);
            } else {
                alert('No sections received');
            }
        }, 1);
        this.courseInfoModal.modal('show');
    }

    private clearBtnClicked(): void {
        const self = this;
        $.ajax({
            url: '/api/schedule/generator',
            headers,
            method: 'DELETE',
            success() {
                GeneratorListComponent.getGeneratorList((list: GeneratorList) => {
                    self.renderGenerator(list);
                });
            },
            error(xhr, status) {
                alert('There was an error. Status:' + status);
            }
        });
    }

    private addToGeneratorList(course: ScheduledCourse): void {
        this.updateQueryCourse('PUT', course);
    }

    private updateGeneratorEntry(course: ScheduledCourse, checked: boolean): void {
        const data = {
            section_id: course.section.id,
            meeting_id: course.section.meeting.id,
            required: checked ? 1 : 0
        };
        this.updateQuery('POST', data);
    }

    private deleteGeneratorEntry(course: ScheduledCourse): void {
        this.updateQueryCourse('DELETE', course);
    }

    private updateQueryCourse(method: string, course: ScheduledCourse): void {
        const data: any = {section_id: course.section.id, meeting_id: course.section.meeting.id};
        this.updateQuery(method, data);
    }

    private updateQuery(method: string, data: { section_id: number, meeting_id: number }): void {
        // const data: any = {section_id: course.section.id, meeting_id: course.section.meeting.id};
        const self = this;
        $.ajax({
            url: '/api/schedule/generator',
            method: method,
            headers,
            data,
            success(response) {
                const generatorObj = response.data.generator;
                self.renderGenerator(generatorObj);
            },
            error() {
                alert('There was an error.')
            }
        })
    }

    private renderGenerator(generatorListObj: GeneratorList): void {
        const entries: GeneratorEntry[] = generatorListObj.entries;
        this.setCreditDisplay(generatorListObj.credit_limit);
        const tbody = this.genListTable.find('tbody');
        tbody.empty();

        if (entries.length > 0) {
            entries.forEach(entry => {
                this.addEntryToGeneratorHtml(entry);
            });
        } else {
            tbody.append($(`
            <tr>
                <td colspan="3">
                    <strong class="lead">
                        No items added yet. Add new courses to get started.
                    </strong>
                </td>
            </tr>`));
        }
        this.parent.scrollTop(this.parent.prop("scrollHeight"));
    }

    private addEntryToGeneratorHtml(entry: GeneratorEntry): void {
        const table = this.genListTable;
        const course = entry.course;
        const sec = course.section;
        const meeting: Meeting = sec.meeting;
        const self = this;
        const a = $(`
            <a href="#"><strong>${course.name} - ${sec.instructors != null ? sec.instructors : 'Section'}</strong></a>
        `);

        const required = $(`<input type="checkbox" ${entry.required ? 'checked' : ''}>`);
        const del = $(`<a class="" href="#"><span class="glyphicon glyphicon-remove"></span></a>`);
        const tr = $('<tr></tr>');

        del.on('click', e => {
            e.preventDefault();
            self.deleteGeneratorEntry(course);
        });

        required.on('click', () => {
            self.updateGeneratorEntry(course, required.prop('checked'));
        });

        a.on('click', e => {
            e.preventDefault();
            const modal = $('#courseInfoModal');
            const mBody = modal.find('div[class="modal-body"]');
            mBody.empty();
            const table = $(`
                <table class="table table-condensed">
                    <thead style="display: none;">
                        <tr>
                            <th>Name</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                </table>
            `);
            const tbody = $('<tbody></tbody>');
            table.append(tbody);
            mBody.append(table);

            tbody.append($(`
                <tr>
                    <td>Instructors</td>
                    <td>${sec.instructors != null ? sec.instructors : 'Not specified'}</td>
                </tr>
                <tr>
                    <td>Location</td>
                    <td>${meeting.location != null ? meeting.location : 'Not specified'}</td>
                </tr>
                <tr>
                    <td>Start</td>
                    <td>${moment(meeting.start, ["HH:mm"]).format("h:mm A")}</td>
                </tr>
                <tr>
                    <td>End</td>
                    <td>${moment(meeting.end, ["HH:mm"]).format("h:mm A")}</td>
                </tr>
            `));
            const tr = $('<tr></tr>');
            const td = $(`<td colspan="2"></td>`);
            tr.append(td);

            const week = meeting.week;
            td.append(renderMeetDaysDisplay(week));

            // new MeetingDaysComponent(false, td, meeting.week);
            tbody.append(td);

            const title = modal.find('h4[class="modal-title"]');
            title.empty();
            title.append($(`<strong>Course: ${course.name}, credits: ${course.credits}</strong>`));
            modal.modal('show');
        });

        table.find('tbody').append(
            tr.append($('<td></td>').append(a))
                .append($('<td></td>').append(required))
                .append($('<td></td>').append(del))
        );
    }

    private static getGeneratorList(onComplete: (generatorList: GeneratorList) => void): void {
        $.ajax({
            url: '/api/schedule/generator',
            method: 'GET',
            success(response) {
                const data = response.data;
                const generatorList = GeneratorListComponent.transmuteGeneratorReponseData(data);
                if (generatorList == null) {
                    alert('There was an error retrieving list');
                    throw new Error('Error getting data');
                } else {
                    onComplete(generatorList);
                }
            },
            error(xhr: JQueryXHR, status) {
                alert('There was an error retrieving data.<br>' + status);
            }
        });
    }

    private static transmuteGeneratorReponseData(data: any): GeneratorList | null {
        const respGen = data.generator;
        if (respGen != null) {
            return {
                id: respGen.id,
                student_id: respGen.student_id,
                credit_limit: respGen.credit_limit,
                entries: respGen['entries']
            }
        } else {
            return null;
        }
    }

}