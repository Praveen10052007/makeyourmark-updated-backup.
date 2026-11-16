export interface DepartmentProfileMeta {
  id: string;
  name: string;
  category:
    | 'Computer Science & IT'
    | 'Electronics & Electrical'
    | 'Mechanical & Industrial'
    | 'Civil, Chemical & Process'
    | 'Biotechnology & Healthcare'
    | 'Other Engineering & Non-Engineering';
  suggestedDegrees: string[];
  coreSkills: string[];
  interestTags: string[];
  careerRoles: string[];
  starterProjects: string[];
}

export const DEPARTMENT_CATEGORIES: DepartmentProfileMeta['category'][] = [
  'Computer Science & IT',
  'Electronics & Electrical',
  'Mechanical & Industrial',
  'Civil, Chemical & Process',
  'Biotechnology & Healthcare',
  'Other Engineering & Non-Engineering',
];

export const ALL_DEPARTMENTS: DepartmentProfileMeta[] = [
  {
    id: 'cse',
    name: 'Computer Science & Engineering (CSE)',
    category: 'Computer Science & IT',
    suggestedDegrees: ['B.E.', 'B.Tech', 'M.Tech', 'Integrated M.Sc'],
    coreSkills: ['Data Structures & Algorithms', 'OOP', 'DBMS & SQL', 'Operating Systems', 'Computer Networks', 'Git & Linux', 'React / TypeScript', 'Node.js / Python'],
    interestTags: ['Full-Stack Web', 'System Design', 'Cloud & DevOps', 'Open Source', 'Competitive Programming'],
    careerRoles: ['Software Development Engineer', 'Full-Stack Developer', 'Backend Engineer', 'Cloud & DevOps Engineer'],
    starterProjects: ['Distributed Task Queue & REST API', 'Campus Placement Tracker with Auth & Analytics'],
  },
  {
    id: 'it',
    name: 'Information Technology (IT)',
    category: 'Computer Science & IT',
    suggestedDegrees: ['B.Tech', 'B.E.', 'M.Tech', 'B.Sc IT'],
    coreSkills: ['Java / Python', 'Web Development', 'REST APIs', 'SQL & NoSQL', 'Software Engineering', 'Cloud Basics', 'Testing & CI/CD'],
    interestTags: ['Web & Mobile Apps', 'Enterprise SaaS', 'API Integration', 'Database Architecture'],
    careerRoles: ['Software Developer', 'Frontend Engineer', 'Mobile App Developer', 'QA Automation Engineer'],
    starterProjects: ['Student Resource Sharing Portal', 'Multi-Tenant Inventory Dashboard'],
  },
  {
    id: 'aiml',
    name: 'Artificial Intelligence & Machine Learning (AI&ML)',
    category: 'Computer Science & IT',
    suggestedDegrees: ['B.Tech AI&ML', 'B.E. CSE (AI&ML)', 'M.Tech AI'],
    coreSkills: ['Python', 'Linear Algebra & Calculus', 'Probability & Statistics', 'Scikit-Learn', 'PyTorch / TensorFlow', 'NLP & Transformers', 'Feature Engineering'],
    interestTags: ['Generative AI', 'Computer Vision', 'NLP', 'MLOps', 'Reinforcement Learning'],
    careerRoles: ['Machine Learning Engineer', 'AI Engineer', 'NLP Specialist', 'Research Engineer'],
    starterProjects: ['Multilingual Document Summarizer', 'Defect Detection Computer Vision Pipeline'],
  },
  {
    id: 'aids',
    name: 'Artificial Intelligence & Data Science (AI&DS)',
    category: 'Computer Science & IT',
    suggestedDegrees: ['B.Tech AI&DS', 'B.Sc Data Science', 'M.Sc Data Science'],
    coreSkills: ['Python', 'Pandas & NumPy', 'SQL', 'Data Visualization', 'Statistical Inference', 'Time-Series Forecasting', 'Spark / ETL'],
    interestTags: ['Business Intelligence', 'Predictive Modeling', 'Big Data Pipelines', 'Quantitative Analytics'],
    careerRoles: ['Data Scientist', 'Data Analyst', 'Analytics Engineer', 'BI Developer'],
    starterProjects: ['Regional Placement & Salary Analytics Engine', 'Demand Forecasting Interactive Dashboard'],
  },
  {
    id: 'cyber',
    name: 'Cybersecurity & Information Security',
    category: 'Computer Science & IT',
    suggestedDegrees: ['B.E. CSE (Cybersecurity)', 'B.Tech', 'M.Tech Cyber Defense'],
    coreSkills: ['Computer Networks & TCP/IP', 'Linux Administration', 'Cryptography', 'OWASP Top 10', 'Ethical Hacking', 'Python & Bash', 'SIEM Fundamentals'],
    interestTags: ['Network Security', 'AppSec', 'Cloud Security', 'Digital Forensics', 'CTF Challenges'],
    careerRoles: ['Cybersecurity Analyst', 'SOC Analyst', 'Application Security Engineer', 'Penetration Tester'],
    starterProjects: ['Automated Header & Vulnerability Scanner', 'Log Anomaly Intrusion Detector'],
  },
  {
    id: 'ece',
    name: 'Electronics & Communication Engineering (ECE)',
    category: 'Electronics & Electrical',
    suggestedDegrees: ['B.E.', 'B.Tech', 'M.E.', 'M.Tech'],
    coreSkills: ['Digital Electronics', 'Analog Circuits', 'Signals & Systems', 'Communication Systems', 'Microcontrollers', 'C / Embedded C', 'MATLAB / Simulink', 'PCB Design'],
    interestTags: ['Wireless 5G/RF', 'IoT Systems', 'Signal Processing', 'Hardware Prototyping'],
    careerRoles: ['Electronics Engineer', 'RF & Telecom Engineer', 'Embedded Systems Engineer', 'Hardware Test Engineer'],
    starterProjects: ['LoRa Smart Agriculture Telemetry Node', 'DSP Noise Filtering Bench Tool'],
  },
  {
    id: 'eee',
    name: 'Electrical & Electronics Engineering (EEE)',
    category: 'Electronics & Electrical',
    suggestedDegrees: ['B.E.', 'B.Tech', 'M.Tech Power Systems'],
    coreSkills: ['Circuit Theory', 'Electrical Machines', 'Power Electronics', 'Control Systems', 'Power Systems Protection', 'PLC / SCADA', 'MATLAB / Simulink'],
    interestTags: ['EV Powertrain & BMS', 'Smart Grid', 'Renewable Solar/Wind', 'Industrial Automation'],
    careerRoles: ['Electrical Design Engineer', 'EV Powertrain Engineer', 'Power Systems Engineer', 'Automation Engineer'],
    starterProjects: ['Solar MPPT Charge Controller Simulation', 'Three-Phase Fault Monitor Prototype'],
  },
  {
    id: 'ei',
    name: 'Electronics & Instrumentation Engineering (E&I)',
    category: 'Electronics & Electrical',
    suggestedDegrees: ['B.E.', 'B.Tech'],
    coreSkills: ['Sensors & Transducers', 'Process Control & PID', 'PLC & SCADA', 'DCS Systems', 'Signal Conditioning', 'LabVIEW / MATLAB'],
    interestTags: ['Process Automation', 'Smart Factories', 'Biomedical Sensors', 'Industrial IoT'],
    careerRoles: ['Instrumentation & Control Engineer', 'Automation Specialist', 'Field Process Engineer'],
    starterProjects: ['Closed-Loop PID Thermal Chamber Controller', 'SCADA Tank Level Telemetry Panel'],
  },
  {
    id: 'vlsi',
    name: 'VLSI Design & Embedded Systems',
    category: 'Electronics & Electrical',
    suggestedDegrees: ['B.E. / B.Tech', 'M.Tech VLSI', 'PG Diploma Embedded'],
    coreSkills: ['Verilog / SystemVerilog', 'Digital Logic Design', 'Static Timing Analysis', 'CMOS Fundamentals', 'ARM Cortex-M', 'RTOS', 'Embedded C / C++', 'SPI / I2C / UART'],
    interestTags: ['RTL Design & Verification', 'ASIC / FPGA', 'Firmware Engineering', 'Edge AI Hardware'],
    careerRoles: ['VLSI Design / Verification Engineer', 'Embedded Firmware Engineer', 'FPGA Engineer', 'Physical Design Engineer'],
    starterProjects: ['AXI-Lite UART Controller in Verilog', 'FreeRTOS Real-Time Sensor Logger on STM32'],
  },
  {
    id: 'mech',
    name: 'Mechanical Engineering',
    category: 'Mechanical & Industrial',
    suggestedDegrees: ['B.E.', 'B.Tech', 'M.E.', 'Diploma'],
    coreSkills: ['Engineering Mechanics', 'Thermodynamics & Heat Transfer', 'Fluid Mechanics', 'Strength of Materials', 'SolidWorks / AutoCAD', 'ANSYS FEA/CFD', 'GD&T'],
    interestTags: ['CAD/CAM & Product Design', 'Thermal & Energy Systems', 'Robotics', 'Aerospace Structures'],
    careerRoles: ['Mechanical Design Engineer', 'CAE / FEA Analyst', 'HVAC / Thermal Engineer', 'R&D Product Engineer'],
    starterProjects: ['FEA Stress Optimization of Bracket Assembly', 'Parametric Planetary Gearbox CAD Model'],
  },
  {
    id: 'auto',
    name: 'Automobile & Automotive Engineering',
    category: 'Mechanical & Industrial',
    suggestedDegrees: ['B.E.', 'B.Tech', 'M.Tech Automotive'],
    coreSkills: ['Vehicle Dynamics', 'EV Powertrain & Battery Thermal', 'CAN Bus Diagnostics', 'IC Engines & Emissions', 'CATIA / SolidWorks', 'MATLAB Simulink'],
    interestTags: ['Electric Vehicles', 'ADAS & Autonomy', 'Motorsport Chassis', 'Battery Management Systems'],
    careerRoles: ['Automotive Design Engineer', 'EV Battery Systems Engineer', 'Vehicle Testing Engineer'],
    starterProjects: ['EV Regenerative Braking Simulink Model', 'CAN-Bus Telemetry Visualizer'],
  },
  {
    id: 'mechatronics',
    name: 'Mechatronics & Robotics Engineering',
    category: 'Mechanical & Industrial',
    suggestedDegrees: ['B.E.', 'B.Tech', 'M.Tech Robotics'],
    coreSkills: ['Kinematics & Dynamics', 'Actuators & Drives', 'ROS2 / Python / C++', 'Control Systems', 'CAD Modeling', 'Embedded Microcontrollers', 'Computer Vision'],
    interestTags: ['Autonomous Mobile Robots', 'Industrial Cobots', 'Drone Control', 'Smart Actuation'],
    careerRoles: ['Robotics Engineer', 'Mechatronics Systems Engineer', 'Automation Controls Engineer'],
    starterProjects: ['ROS2 2-Wheel SLAM Navigation Rover', 'Pick-and-Place Inverse Kinematics Arm'],
  },
  {
    id: 'civil',
    name: 'Civil & Structural Engineering',
    category: 'Civil, Chemical & Process',
    suggestedDegrees: ['B.E.', 'B.Tech', 'M.E. Structural'],
    coreSkills: ['Structural Analysis', 'RCC & Steel Design', 'AutoCAD Civil 3D', 'STAAD.Pro / ETABS', 'Revit BIM', 'Geotechnical Mechanics', 'Surveying & Estimation'],
    interestTags: ['BIM & Smart Cities', 'Sustainable Green Buildings', 'Bridge & Infrastructure', 'Construction Management'],
    careerRoles: ['Structural Engineer', 'BIM Coordinator', 'Site & Project Engineer', 'Quantity Surveyor'],
    starterProjects: ['G+5 Seismic Frame Analysis in ETABS', 'Revit BIM Clash-Detection Workflow'],
  },
  {
    id: 'chemical',
    name: 'Chemical & Process Engineering',
    category: 'Civil, Chemical & Process',
    suggestedDegrees: ['B.Tech', 'B.E.', 'M.Tech Chemical'],
    coreSkills: ['Mass & Energy Balances', 'Chemical Reaction Engineering', 'Thermodynamics', 'Heat & Mass Transfer', 'Aspen Plus / HYSYS', 'Process Safety (HAZOP)'],
    interestTags: ['Clean Energy & Hydrogen', 'Pharmaceutical Manufacturing', 'Battery Electrolytes', 'Process Simulation'],
    careerRoles: ['Process Design Engineer', 'Production Operations Engineer', 'Quality & Safety Engineer'],
    starterProjects: ['Aspen Distillation Column Energy Pinch Study', 'Continuous Stirred Tank Reactor Dynamics'],
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing & Production Engineering',
    category: 'Civil, Chemical & Process',
    suggestedDegrees: ['B.E.', 'B.Tech', 'M.Tech Industrial'],
    coreSkills: ['CNC Machining & Tooling', 'Lean Six Sigma', 'Additive Manufacturing', 'Metrology & Quality Control', 'Supply Chain & ERP', 'Industry 4.0 IoT'],
    interestTags: ['Smart Factory Lean', '3D Printing', 'Operations Research', 'Quality Assurance'],
    careerRoles: ['Manufacturing Engineer', 'Industrial & Lean Engineer', 'Quality Assurance Engineer'],
    starterProjects: ['OEE Bottleneck Reduction Simulation', 'Tolerance Stack-Up & SPC Control Chart Suite'],
  },
  {
    id: 'biotech',
    name: 'Biotechnology',
    category: 'Biotechnology & Healthcare',
    suggestedDegrees: ['B.Tech', 'B.Sc', 'M.Sc', 'M.Tech'],
    coreSkills: ['Molecular Biology', 'Microbiology', 'Bioprocess Engineering', 'PCR & Electrophoresis', 'Bioinformatics (Python/R)', 'Chromatography & HPLC', 'GMP Compliance'],
    interestTags: ['Biopharma & Upstream Process', 'Genomics & Bioinformatics', 'Food & Agri-Biotech', 'Synthetic Biology'],
    careerRoles: ['Bioprocess Engineer', 'Bioinformatics Analyst', 'QC / QA Microbiologist', 'Clinical Research Associate'],
    starterProjects: ['Sequence Alignment & Variant Pipeline in Python', 'Fermentation Yield Optimization Model'],
  },
  {
    id: 'biomed',
    name: 'Biomedical Engineering',
    category: 'Biotechnology & Healthcare',
    suggestedDegrees: ['B.E.', 'B.Tech', 'M.Tech Biomedical'],
    coreSkills: ['Biomedical Instrumentation', 'ECG/EEG Signal Processing', 'Medical Imaging (DICOM)', 'Embedded Microcontrollers', 'ISO 13485 Regulatory Standards', 'Biomechanics'],
    interestTags: ['Wearable Health Diagnostics', 'Prosthetics & Rehab', 'Medical AI Imaging', 'Hospital Equipment Systems'],
    careerRoles: ['Biomedical R&D Engineer', 'Clinical Engineer', 'Medical Device QA Specialist'],
    starterProjects: ['Real-Time PPG Heart-Rate & SpO2 Filter', 'DICOM Medical Slice Viewer Prototype'],
  },
  {
    id: 'other-non-eng',
    name: 'Other Engineering & Non-Engineering (B.Sc / BCA / BBA / B.Com / Arts / MBA)',
    category: 'Other Engineering & Non-Engineering',
    suggestedDegrees: ['B.Sc', 'BCA', 'BBA', 'B.Com', 'B.A.', 'MBA', 'MCA', 'Aerospace / Marine / Agri'],
    coreSkills: ['Excel & Data Modeling', 'SQL / Python Fundamentals', 'Communication & Writing', 'Financial & Business Analysis', 'Research & Presentation', 'Project Management'],
    interestTags: ['Product Management', 'Business Analytics', 'FinTech & Consulting', 'Digital Marketing', 'Civil Services / Higher Studies'],
    careerRoles: ['Business Analyst', 'Product Associate', 'Operations Analyst', 'Digital Strategist', 'UI/UX Designer'],
    starterProjects: ['Market & Customer Cohort Case Study', 'Interactive KPI Reporting Workbook & Presentation'],
  },
];

export function findDepartmentMeta(nameOrId?: string): DepartmentProfileMeta {
  if (!nameOrId) return ALL_DEPARTMENTS[0];
  const lower = nameOrId.toLowerCase();
  return (
    ALL_DEPARTMENTS.find(
      (d) =>
        d.id === lower ||
        d.name.toLowerCase() === lower ||
        d.name.toLowerCase().includes(lower) ||
        lower.includes(d.id)
    ) || ALL_DEPARTMENTS[0]
  );
}
