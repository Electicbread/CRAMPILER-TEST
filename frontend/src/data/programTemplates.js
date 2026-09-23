// HOW TO ADD YOUR OWN PROGRAM, YEAR, SEMESTER, AND COURSES
// -----------------------------------------------------------
// Structure: a program has multiple years, each year has semesters, each
// semester has the actual course list for that term.
//
// Each course entry needs a `code` and `name`, plus ONE of:
//   - `type`: a shorthand for one of your institution's standard syllabus
//     structures, defined in courseTypeTemplates.js. Use this for the vast
//     majority of courses — it's one line instead of manually spelling out
//     every category:
//       { code: 'CSS121P', name: 'Computer Programming 1', type: 'paired' }
//     Available types: 'paired', 'math', 'ged', 'other', 'pathfit', 'lab'.
//   - `categoryWeights`: a fully custom map, for the rare course that
//     doesn't match any of the standard types:
//       { code: 'SPECIAL01', name: 'Thesis Writing',
//         categoryWeights: { Draft: 0.4, Defense: 0.6 } }
//
// If a course has neither `type` nor `categoryWeights`, it's created with
// no categories — you'd build its syllabus manually in the Courses tab
// (still totally fine, just slower for that one course).
//
// Save the file. The Courses tab picks up new programs/years/semesters
// automatically — no other code changes needed.

export const PROGRAM_TEMPLATES = [
    {
        name: 'Computer Science',
        years: [
            {
                year: 'Year 1',
                semesters: [
                    {
                        semester: '1st Semester',
                        courses: [
                            { code: 'CSS121P', name: 'Computer Programming 1', type: 'paired' },
                            { code: 'CSS101', name: 'Introduction to Computer Science', type: 'other' },
                            { code: 'MATH165', name: 'College Algebra', type: 'math' },
                            { code: 'GED101', name: 'Understanding the Self', type: 'ged' },
                            { code: 'GED103', name: 'Readings in Philippine History', type: 'ged' },
                            { code: 'FW01-2', name: 'PATHFIT 1', type: 'pathfit' },
                            { code: 'NSTP001', name: 'National Service Training Program 1', type: 'other' },
                        ],
                    },
                    {
                        semester: '2nd Semester',
                        courses: [
                            { code: 'CSS122P', name: 'Computer Programming 2', type: 'paired' },
                            // ...add the rest of Year 1, 2nd Semester's courses here
                        ],
                    },
                ],
            },
            {
                year: 'Year 2',
                semesters: [
                    {
                        semester: '1st Semester',
                        courses: [
                            { code: 'CSS123P', name: 'Computer Programming 3', type: 'paired' },
                            { code: 'DSS110', name: 'Introduction to Computer Science', type: 'other' },
                            { code: 'ITS112P', name: 'Computer Architecture and Organization', type: 'paired' },
                            { code: 'MATH175', name: 'Calculus 2', type: 'math' },
                            { code: 'FW04-2', name: 'PATHFIT 4', type: 'pathfit' },
                            { code: 'ITS162-1L', name: 'Data Communications and Networking Essentials (CISCO 2)', type: 'lab' },
                        ]
                    },
                    {
                        semester: '2nd Semester',
                        courses: []
                    },
                ],
            },
            // ...add Year 3, Year 4 following the same { year, semesters } shape
        ],
    },
]