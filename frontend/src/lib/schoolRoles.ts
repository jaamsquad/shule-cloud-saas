// Predefined school roles used across Employees / staff. Users select from these
// — there is NO custom role creation.

export const SCHOOL_ROLE_GROUPS: { group: string; roles: string[] }[] = [
    { group: "School Leadership", roles: [
        "Super Administrator", "School Administrator", "Principal", "Deputy Principal",
        "Academic Director", "Campus Director", "Head Teacher", "Assistant Head Teacher", "Director of Studies",
    ]},
    { group: "Academic Management", roles: [
        "Academic Registrar", "Examination Officer", "Assessment Coordinator", "Curriculum Coordinator",
        "Timetable Coordinator", "Academic Secretary",
    ]},
    { group: "Department Management", roles: [
        "Head of Department (HOD)", "Deputy Head of Department", "Department Coordinator",
    ]},
    { group: "Teaching Staff", roles: [
        "Teacher", "Subject Teacher", "Class Teacher", "Form Teacher", "Teaching Assistant",
        "Practical Instructor", "Laboratory Instructor", "Special Needs Teacher",
    ]},
    { group: "Examination & Assessment", roles: [
        "Chief Examiner", "Examiner", "Invigilator", "Marks Entry Clerk", "Results Moderator",
    ]},
    { group: "Human Resource Management", roles: [
        "HR Manager", "HR Officer", "Recruitment Officer", "Staff Welfare Officer",
    ]},
    { group: "Finance Department", roles: [
        "Finance Manager", "Accountant", "Accounts Clerk", "Bursar", "Cashier", "Payroll Officer", "Procurement Officer",
    ]},
    { group: "Admissions & Registrar Office", roles: [
        "Admissions Officer", "Registrar", "Records Officer", "Enrollment Officer",
    ]},
    { group: "Attendance Management", roles: ["Attendance Officer", "Timekeeper"] },
    { group: "ICT Department", roles: [
        "ICT Administrator", "ICT Officer", "System Administrator", "Network Administrator", "Database Administrator", "Technical Support Officer",
    ]},
    { group: "Library", roles: ["Librarian", "Assistant Librarian"] },
    { group: "Guidance & Student Welfare", roles: [
        "Guidance Counselor", "School Counselor", "Student Welfare Officer", "Discipline Master/Mistress",
    ]},
    { group: "Health Department", roles: ["School Nurse", "Clinical Officer", "Medical Officer", "Health Coordinator"] },
    { group: "Transport Department", roles: ["Transport Manager", "Transport Coordinator", "Driver", "Bus Attendant"] },
    { group: "Boarding Department", roles: ["Boarding Master", "Boarding Mistress", "Dormitory Supervisor", "Hostel Warden"] },
    { group: "Security Department", roles: ["Security Manager", "Security Officer", "Gate Officer"] },
    { group: "Canteen & Catering", roles: ["Canteen Manager", "Canteen Cashier", "Storekeeper", "Catering Supervisor"] },
    { group: "Store & Inventory", roles: ["Store Manager", "Inventory Officer", "Asset Manager"] },
    { group: "Maintenance Department", roles: ["Maintenance Manager", "Maintenance Officer", "Electrician", "Plumber", "Groundskeeper"] },
    { group: "Sports Department", roles: ["Sports Director", "Sports Coordinator", "Coach", "Sports Coach", "Team Manager"] },
    { group: "Trips & Excursions", roles: ["Trips Coordinator"] },
    { group: "Front Office", roles: ["Receptionist", "Front Desk Officer", "Secretary"] },
    { group: "Event Management", roles: ["Events Coordinator", "Activities Coordinator"] },
    { group: "Communication & Public Relations", roles: ["Communications Officer", "Public Relations Officer", "Marketing Officer"] },
];

export const SCHOOL_ROLES: string[] = SCHOOL_ROLE_GROUPS.flatMap(g => g.roles);
