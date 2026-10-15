const store = require('./store');

function seedDatabase() {
  const existingExams = store.getExams();
  const existingCodes = new Set(existingExams.map((e) => e.courseCode));

  const quarterExams = [
    // ==========================================
    // 1. CALCULUS I (MATH-101)
    // ==========================================
    {
      id: 'exam_calculus_1',
      title: 'Calculus I - Midterm Examination',
      subject: 'Calculus I',
      courseCode: 'MATH-101',
      instructorName: 'Dr. Tsegaye Alemu (Mathematics Department)',
      description: 'Comprehensive assessment of limits, continuity, derivatives, optimization, and fundamental integrals.',
      durationMinutes: 90,
      totalMarks: 100,
      passingScore: 50,
      instructions: 'Answer all questions. Scientific calculator is permitted. Show all working for problem derivations.',
      randomizeQuestions: false,
      questions: [
        {
          id: 'calc_q1',
          order: 1,
          type: 'MCQ',
          points: 10,
          prompt: 'Evaluate the trigonometric limit: $$\\lim_{x \\to 0} \\frac{\\sin(3x)}{x}$$',
          options: ['0', '1', '3', 'Does not exist'],
          correctAnswer: '3',
          rubric: 'Standard limit property: lim_{u -> 0} sin(u)/u = 1, so 3 * 1 = 3.'
        },
        {
          id: 'calc_q2',
          order: 2,
          type: 'MCQ',
          points: 15,
          prompt: 'Compute the first derivative $\\frac{df}{dx}$ of the function $$f(x) = x^3 e^{2x}$$ using the product rule.',
          options: [
            '$3x^2 e^{2x}$',
            '$e^{2x}(3x^2 + 2x^3)$',
            '$6x^2 e^{2x}$',
            '$2x^3 e^{2x}$'
          ],
          correctAnswer: '$e^{2x}(3x^2 + 2x^3)$',
          rubric: 'f\'(x) = (x^3)\'(e^{2x}) + (x^3)(e^{2x})\' = 3x^2 e^{2x} + 2x^3 e^{2x}.'
        },
        {
          id: 'calc_q3',
          order: 3,
          type: 'MCQ',
          points: 15,
          prompt: 'Evaluate the definite integral: $$\\int_{0}^{2} (3x^2 - 2x + 1) \\, dx$$',
          options: ['4', '6', '8', '10'],
          correctAnswer: '6',
          rubric: '[x^3 - x^2 + x]_0^2 = (8 - 4 + 2) - 0 = 6.'
        },
        {
          id: 'calc_q4',
          order: 4,
          type: 'TRUE_FALSE',
          points: 10,
          prompt: 'Determine if the following statement is True or False: "If a function $f(x)$ is continuous at $x = c$, then $f(x)$ is guaranteed to be differentiable at $x = c$."',
          options: ['True', 'False'],
          correctAnswer: 'False',
          rubric: 'Counterexample: f(x) = |x| is continuous at x=0 but has a sharp cusp and is not differentiable there.'
        },
        {
          id: 'calc_q5',
          order: 5,
          type: 'SHORT_ANSWER',
          points: 15,
          prompt: 'State the formula for the Mean Value Theorem for a differentiable function on $[a, b]$: $$\\frac{f(b) - f(a)}{b - a} = \\text{?}$$',
          options: [],
          correctAnswer: "f'(c)",
          rubric: "Accept f'(c) or f prime of c for some c in (a, b)."
        },
        {
          id: 'calc_q6',
          order: 6,
          type: 'ESSAY',
          points: 35,
          prompt: 'An open rectangular box is to be constructed from a cardboard sheet of dimensions $12\\text{ cm} \\times 12\\text{ cm}$ by cutting equal squares of side $x$ from each corner and turning up the sides. Find the value of $x$ that maximizes the volume $V(x) = x(12 - 2x)^2$. Show your first and second derivative tests.',
          options: [],
          correctAnswer: 'x = 2 cm yields maximum volume of 128 cm^3.',
          rubric: 'Full credit requires setting V\'(x)=0, solving for x=2, and verifying V\'\'(2) < 0.'
        }
      ]
    },

    // ==========================================
    // 2. CHEMISTRY I (CHEM-101)
    // ==========================================
    {
      id: 'exam_chemistry_1',
      title: 'Chemistry I - Stoichiometry & Chemical Principles Exam',
      subject: 'Chemistry I',
      courseCode: 'CHEM-101',
      instructorName: 'Dr. Bethlehem Desta (Department of Chemical Sciences)',
      description: 'Examination covering stoichiometric calculations, chemical bonding, gas laws, and solution chemistry.',
      durationMinutes: 90,
      totalMarks: 100,
      passingScore: 50,
      instructions: 'Periodic table values: H = 1.01, C = 12.01, O = 16.00, S = 32.07 g/mol.',
      randomizeQuestions: false,
      questions: [
        {
          id: 'chem_q1',
          order: 1,
          type: 'MCQ',
          points: 10,
          prompt: 'What is the stoichiometric coefficient for $\\text{O}_2$ when the combustion equation of propane is completely balanced? $$\\text{C}_3\\text{H}_8 + ?\\,\\text{O}_2 \\rightarrow 3\\,\\text{CO}_2 + 4\\,\\text{H}_2\\text{O}$$',
          options: ['3', '4', '5', '7'],
          correctAnswer: '5',
          rubric: 'Right side has (3*2) + 4 = 10 O atoms. Therefore 10/2 = 5 O2 molecules.'
        },
        {
          id: 'chem_q2',
          order: 2,
          type: 'MCQ',
          points: 15,
          prompt: 'Calculate the molar mass of sulfuric acid, $\\text{H}_2\\text{SO}_4$.',
          options: ['98.08 g/mol', '82.07 g/mol', '96.06 g/mol', '104.12 g/mol'],
          correctAnswer: '98.08 g/mol',
          rubric: '2(1.01) + 32.07 + 4(16.00) = 2.02 + 32.07 + 64.00 = 98.09 g/mol.'
        },
        {
          id: 'chem_q3',
          order: 3,
          type: 'MCQ',
          points: 15,
          prompt: 'Which intermolecular force is primarily responsible for the anomalously high boiling point of water ($\\text{H}_2\\text{O}$) compared to $\\text{H}_2\\text{S}$?',
          options: [
            'London dispersion forces',
            'Dipole-induced dipole forces',
            'Hydrogen bonding',
            'Ionic electrostatics'
          ],
          correctAnswer: 'Hydrogen bonding',
          rubric: 'Hydrogen bonding between H and highly electronegative O atoms.'
        },
        {
          id: 'chem_q4',
          order: 4,
          type: 'TRUE_FALSE',
          points: 10,
          prompt: 'Determine if the statement is True or False: "In an oxidation-reduction (redox) reaction, oxidation is the process of losing electrons, while reduction is the gain of electrons."',
          options: ['True', 'False'],
          correctAnswer: 'True',
          rubric: 'OIL RIG mnemonic: Oxidation Is Loss, Reduction Is Gain.'
        },
        {
          id: 'chem_q5',
          order: 5,
          type: 'SHORT_ANSWER',
          points: 15,
          prompt: 'What is the pH of an aqueous solution with a hydronium ion concentration of $[\\text{H}_3\\text{O}^+] = 1.0 \\times 10^{-4}\\text{ M}$?',
          options: [],
          correctAnswer: '4',
          rubric: 'pH = -log[H+] = -log(1.0 x 10^-4) = 4.'
        },
        {
          id: 'chem_q6',
          order: 6,
          type: 'ESSAY',
          points: 35,
          prompt: 'Consider the Haber-Bosch ammonia synthesis equilibrium: $$\\text{N}_2(g) + 3\\,\\text{H}_2(g) \\rightleftharpoons 2\\,\\text{NH}_3(g) \\quad (\\Delta H = -92.4\\text{ kJ/mol})$$ Using Le Chatelier\'s principle, thoroughly explain the effect on ammonia yield when: (a) Total system pressure is increased, (b) Temperature is raised, and (c) A solid iron catalyst is introduced.',
          options: [],
          correctAnswer: '(a) Shifts right (yield increases), (b) Shifts left (yield decreases), (c) No shift in equilibrium position (accelerates rate only).',
          rubric: 'Award 10 pts for (a), 15 pts for (b), and 10 pts for (c).'
        }
      ]
    },

    // ==========================================
    // 3. ENGLISH I (ENG-101)
    // ==========================================
    {
      id: 'exam_english_1',
      title: 'English I - Academic Composition & Rhetoric Exam',
      subject: 'English I',
      courseCode: 'ENG-101',
      instructorName: 'Prof. Rahel Assefa (Department of Humanities)',
      description: 'Assessment in critical reading, thesis development, argumentation, citation ethics, and academic writing.',
      durationMinutes: 90,
      totalMarks: 100,
      passingScore: 50,
      instructions: 'Demonstrate proper academic register, clarity, and grammatical cohesion.',
      randomizeQuestions: false,
      questions: [
        {
          id: 'eng_q1',
          order: 1,
          type: 'MCQ',
          points: 10,
          prompt: 'Which of the following sentences represents an effective, debatable academic thesis statement?',
          options: [
            'Digital technology has changed communication in modern societies.',
            'Although social media facilitates global connectivity, algorithmic feed curation polarizes public discourse and degrades critical thinking skills.',
            'Smartphones are handheld electronic devices that access the internet.',
            'Many students at universities own computers.'
          ],
          correctAnswer: 'Although social media facilitates global connectivity, algorithmic feed curation polarizes public discourse and degrades critical thinking skills.',
          rubric: 'Option B presents an argument with concession and specific causal claims.'
        },
        {
          id: 'eng_q2',
          order: 2,
          type: 'MCQ',
          points: 15,
          prompt: 'Identify the sentence that contains a comma splice grammatical error:',
          options: [
            'The experiment yielded unexpected results, so the researchers repeated the trial.',
            'The laboratory was closed for maintenance; consequently, all scheduled tests were postponed.',
            'The experiment yielded unexpected results, the researchers repeated the trial immediately.',
            'Because the experiment yielded unexpected results, the researchers repeated the trial.'
          ],
          correctAnswer: 'The experiment yielded unexpected results, the researchers repeated the trial immediately.',
          rubric: 'Two independent clauses joined only with a comma without coordinating conjunction.'
        },
        {
          id: 'eng_q3',
          order: 3,
          type: 'MCQ',
          points: 15,
          prompt: 'In academic writing, what is the primary difference between a primary source and a secondary source?',
          options: [
            'Primary sources are written in English, whereas secondary sources are translated.',
            'Primary sources provide raw, firsthand evidence or data, while secondary sources analyze, synthesize, or interpret primary materials.',
            'Primary sources are peer-reviewed, while secondary sources are never reviewed.',
            'Primary sources are books, while secondary sources are websites.'
          ],
          correctAnswer: 'Primary sources provide raw, firsthand evidence or data, while secondary sources analyze, synthesize, or interpret primary materials.',
          rubric: 'Direct firsthand accounts vs analytical commentary.'
        },
        {
          id: 'eng_q4',
          order: 4,
          type: 'TRUE_FALSE',
          points: 10,
          prompt: 'Determine if the statement is True or False: "Paraphrasing a source idea into your own words without including an in-text citation is considered plagiarism in academic research."',
          options: ['True', 'False'],
          correctAnswer: 'True',
          rubric: 'Both direct quotes and paraphrased intellectual ideas require citation.'
        },
        {
          id: 'eng_q5',
          order: 5,
          type: 'SHORT_ANSWER',
          points: 15,
          prompt: 'In rhetoric, what are Aristotle\'s three fundamental appeals used to persuade an audience?',
          options: [],
          correctAnswer: 'Ethos, Pathos, and Logos',
          rubric: 'Ethos (credibility), Pathos (emotion), Logos (logic).'
        },
        {
          id: 'eng_q6',
          order: 6,
          type: 'ESSAY',
          points: 35,
          prompt: 'Write a persuasive academic paragraph (150-250 words) evaluating whether universities should enforce digital exam lockdown browsers during final assessments. Structure your response with a clear topic sentence, supporting evidence or reasoning, address a counterargument, and conclude with synthesis.',
          options: [],
          correctAnswer: 'Subjective academic composition graded on clarity, structure, and rhetorical quality.',
          rubric: 'Topic sentence (5 pts), development & evidence (15 pts), counterargument address (10 pts), grammar & register (5 pts).'
        }
      ]
    },

    // ==========================================
    // 4. PHYSICS I (PHYS-101)
    // ==========================================
    {
      id: 'exam_physics_1',
      title: 'Physics I - Classical Mechanics & Dynamics Final Exam',
      subject: 'Physics I',
      courseCode: 'PHYS-101',
      instructorName: 'Dr. Dawit Haile (Department of Applied Physics)',
      description: 'Calculus-based university physics exam covering kinematics, Newton\'s laws, work-energy, momentum, and rotational dynamics.',
      durationMinutes: 90,
      totalMarks: 100,
      passingScore: 50,
      instructions: 'Assume acceleration due to gravity $g = 9.8\\text{ m/s}^2$ unless stated otherwise. Formulas must be shown.',
      randomizeQuestions: false,
      questions: [
        {
          id: 'phys_q1',
          order: 1,
          type: 'MCQ',
          points: 10,
          prompt: 'A projectile is launched over level ground with an initial speed of $v_0 = 20\\text{ m/s}$ at an elevation angle of $\\theta = 45^\\circ$. What is the horizontal range $R = \\frac{v_0^2 \\sin(2\\theta)}{g}$?',
          options: ['20.4 m', '32.6 m', '40.8 m', '51.2 m'],
          correctAnswer: '40.8 m',
          rubric: 'R = (20^2 * sin(90)) / 9.8 = 400 / 9.8 = 40.82 m.'
        },
        {
          id: 'phys_q2',
          order: 2,
          type: 'MCQ',
          points: 15,
          prompt: 'A $1200\\text{ kg}$ automobile accelerates uniformly from rest to a speed of $v = 25\\text{ m/s}$. According to the Work-Energy Theorem, what was the total net work done on the automobile?',
          options: ['150 kJ', '375 kJ', '600 kJ', '750 kJ'],
          correctAnswer: '375 kJ',
          rubric: 'W_net = Delta K = 1/2 m v^2 = 0.5 * 1200 * 625 = 375,000 J = 375 kJ.'
        },
        {
          id: 'phys_q3',
          order: 3,
          type: 'MCQ',
          points: 15,
          prompt: 'If the distance $r$ between two uniform spherical masses is tripled, by what factor is the gravitational attractive force $F = G\\frac{m_1 m_2}{r^2}$ multiplied?',
          options: ['1/3', '1/6', '1/9', '3'],
          correctAnswer: '1/9',
          rubric: 'Inverse square law: (1/3)^2 = 1/9.'
        },
        {
          id: 'phys_q4',
          order: 4,
          type: 'TRUE_FALSE',
          points: 10,
          prompt: 'Determine if the following statement is True or False: "In an isolated system experiencing a completely elastic collision, both total linear momentum $\\vec{p}$ and total kinetic energy $K$ are strictly conserved."',
          options: ['True', 'False'],
          correctAnswer: 'True',
          rubric: 'Definition of an elastic collision preserves both momentum and kinetic energy.'
        },
        {
          id: 'phys_q5',
          order: 5,
          type: 'SHORT_ANSWER',
          points: 15,
          prompt: 'State Newton\'s Second Law of Motion in terms of rate of change of linear momentum $\\vec{p}$: $$\\vec{F}_{\\text{net}} = \\text{?}$$',
          options: [],
          correctAnswer: 'dp/dt',
          rubric: 'Accept dp/dt, d(mv)/dt, or m*a.'
        },
        {
          id: 'phys_q6',
          order: 6,
          type: 'ESSAY',
          points: 35,
          prompt: 'A solid cylinder of mass $M$ and radius $R$ ($I = \\frac{1}{2}MR^2$) rolls smoothly without slipping down an inclined plane of vertical height $h$. Using conservation of mechanical energy ($E_{\\text{initial}} = E_{\\text{final}}$), derive the algebraic formula for the linear velocity $v$ of the cylinder\'s center of mass at the bottom of the incline.',
          options: [],
          correctAnswer: 'v = sqrt(4/3 * g * h)',
          rubric: 'Mgh = 1/2 M v^2 + 1/2 I omega^2 = 1/2 M v^2 + 1/2(1/2 M R^2)(v/R)^2 = 3/4 M v^2. Solving gives v = sqrt(4/3 g h).'
        }
      ]
    }
  ];

  // Seed each exam if not present
  for (const qExam of quarterExams) {
    if (!existingCodes.has(qExam.courseCode)) {
      store.saveExam(qExam);
      console.log(`✅ Seeded ${qExam.subject} (${qExam.courseCode})`);
    }
  }

  // Ensure active In-Hall sessions exist for the quarter courses
  const existingSessions = store.getAllSessions();
  const existingSubjects = new Set(existingSessions.map(s => (s.subject || '').toLowerCase()));

  for (const qExam of quarterExams) {
    if (!existingSubjects.has(qExam.subject.toLowerCase())) {
      const s = store.createSession(qExam.id, `Main Campus Hall - ${qExam.subject}`, 90, {
        subject: qExam.subject,
        courseCode: qExam.courseCode,
        instructorName: qExam.instructorName,
        instructions: qExam.instructions || 'Standard examination policy applies.'
      });
      console.log(`✅ Created Active Hall Session for ${qExam.subject}. PIN: ${s.pin}`);
    }
  }
}

module.exports = { seedDatabase };

if (require.main === module) {
  seedDatabase();
}
