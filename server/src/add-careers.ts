import { prisma } from './config/prisma';

const careersCategory = {
  id: 'careers',
  name: 'Careers',
  description: 'Job applications, employer replies, interviews, and assessments',
  color: 'indigo',
  icon: 'Briefcase',
  keywords: [
    'deloitte', 'ey', 'ernst & young', 'pwc', 'kpmg', 'mckinsey', 'bain', 'bcg',
    'texas instruments', 'ti', 'amazon', 'microsoft', 'google', 'accenture', 'tcs',
    'infosys', 'wipro', 'cognizant', 'capgemini', 'hcltech', 'cisco', 'siemens',
    'honeywell', 'teradata', "l'oréal", 'loreal', 'bnp paribas', 'schneider electric',
    'naukri', 'internshala', 'workday', 'myworkday', 'greenhouse', 'lever',
    'smartrecruiters', 'icims', 'taleo', 'successfactors', 'sapsf', 'ashby', 'jobvite',
    'hirevue', 'hackerrank', 'codility', 'mettl', 'shl', 'ripplehire', 'superset',
    'darwinbox', 'keka', 'talent acquisition', 'campus recruitment', 'university relations',
    'recruiting team', 'hiring team', 'hr team', 'talent community', 'job alert',
    'application received', 'thank you for applying', 'thank you for your application',
    'applied successfully', 'application status', 'shortlisted', 'interview invitation',
    'interview with', 'interview schedule', 'technical interview', 'hr interview',
    'managerial round', 'online assessment', 'coding assessment', 'technical assessment',
    'hackerrank test', 'candidate portal', 'offer letter', 'letter of intent',
    'pre-placement', 'off-campus drive', 'placement drive', 'junior developer',
    'software engineer', 'trainee engineer', 'analyst', 'hiring', 'recruitment',
    'career opportunity', 'job opening'
  ],
  senderDomains: [],
  isDefault: true,
};

async function run() {
  const users = await prisma.user.findMany();
  for (const u of users) {
    let prefs: any = {};
    try {
      prefs = typeof u.preferences === 'string' ? JSON.parse(u.preferences) : (u.preferences || {});
    } catch (e) {
      prefs = {};
    }

    if (prefs.customCategories) {
      delete prefs.customCategories;
      await prisma.user.update({
        where: { id: u.id },
        data: { preferences: JSON.stringify(prefs) },
      });
      console.log('Reset customCategories for user:', u.email);
    }
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
