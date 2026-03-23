const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.gradingPolicy.findMany({
    where: { deletedAt: null, assessmentType: 'MONTHLY' },
    include: { components: { where: { deletedAt: null, isActive: true } } },
  });
  const bad = [];
  for (const p of rows) {
    const hasMonthly = p.components.some((c) => c.includeInMonthly);
    if (!hasMonthly) {
      bad.push({ id: p.id, subjectId: p.subjectId, components: p.components.length });
    }
  }
  console.log('monthly policies:', rows.length);
  console.log('monthly without monthly components:', bad.length);
  console.log(bad.slice(0, 10));
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
