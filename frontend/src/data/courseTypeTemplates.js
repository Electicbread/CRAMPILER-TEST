// Institution syllabus templates.
//
// Your school's grading structures are nested (e.g. a paired course's
// "OLA 1-6 = 30% of Lecture, and Lecture = 60% of the course" isn't a flat
// percentage on its own). CramPiler's Course model only stores a flat
// { category: fraction } map, so each template below is the ALREADY
// MULTIPLIED-OUT result — e.g. OLA1 = 5% of Lecture x 60% of the course
// = 3% of the whole course. Every template's fractions sum to exactly 1.0.
//
// If your institution's percentages ever change, redo the arithmetic here
// rather than editing sliders by hand in the UI — that's what keeps these
// templates trustworthy as a one-click starting point.

/** Paired courses (course code often ends in "P"): Lecture 60% / Lab 40%. */
const PAIRED = {
    // Lecture (60% of course)
    'OLA1': 0.03, 'OLA2': 0.03, 'OLA3': 0.03, 'OLA4': 0.03, 'OLA5': 0.03, 'OLA6': 0.03, // 30% of Lecture, 5% each, 2 per CO
    'CO1 Summative Assessment': 0.12, 'CO2 Summative Assessment': 0.12, 'CO3 Summative Assessment': 0.12, // 60% of Lecture, 20% each
    'Coursera': 0.06, // 10% of Lecture
    // Lab (40% of course)
    'Exercise 1': 0.04, 'Exercise 2': 0.04, 'Exercise 3': 0.04, 'Exercise 4': 0.04, // 40% of Lab, 10% each
    'CO1 Practical Exam': 0.08, 'CO2 Practical Exam': 0.08, 'CO3 Practical Exam': 0.08, // 60% of Lab, 20% each
}

/** MATH courses: flat three-way split. */
const MATH = {
    'Activities': 0.30,
    'Long Quizzes': 0.40,
    'Finals': 0.30,
}

/** GED courses: CO-based, 35/35/30. */
const GED = {
    'CO1': 0.35,
    'CO2': 0.35,
    'CO3': 0.30,
}

/** Other (standard, non-paired, non-Math/GED/PATHFIT/Lab) courses. */
const OTHER = {
    'CO1 Exercises': 0.15, 'CO2 Exercises': 0.15, 'CO3 Exercises': 0.10, // 40% total, coursera folded in
    'CO1 Summative Assessment': 0.20, 'CO2 Summative Assessment': 0.20, 'CO3 Summative Assessment': 0.20, // 60% total
}

/** PATHFIT courses. */
const PATHFIT = {
    'Practical Exercise 1': 0.07, 'Practical Exercise 2': 0.07, 'Practical Exercise 3': 0.07,
    'Practical Exercise 4': 0.07, 'Practical Exercise 5': 0.07, 'Practical Exercise 6': 0.07,
    'Practical Exercise 7': 0.07, 'Practical Exercise 8': 0.07, 'Practical Exercise 9': 0.07,
    'Practical Exercise 10': 0.07, // 70% total, 7% each
    'Quiz': 0.05,
    'Midterms': 0.10,
    'Finals': 0.15,
}

/** Lab courses: flat four-way split (no Lecture/Lab pairing, unlike PAIRED). */
const LAB = {
    'OLA': 0.10,
    'Quizzes': 0.25,
    'Labs': 0.25,
    'Finals': 0.40,
}

export const COURSE_TYPE_TEMPLATES = {
    paired: PAIRED,
    math: MATH,
    ged: GED,
    other: OTHER,
    pathfit: PATHFIT,
    lab: LAB,
}

export const COURSE_TYPE_LABELS = {
    paired: 'Paired (Lecture 60% / Lab 40%)',
    math: 'Math (Activities/Quizzes/Finals)',
    ged: 'GED (CO-based 35/35/30)',
    other: 'Other (CO Exercises + Summative)',
    pathfit: 'PATHFIT (10 Exercises + Quiz/Midterms/Finals)',
    lab: 'Lab (OLA/Quizzes/Labs/Finals)',
}