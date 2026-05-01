
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$connect().then(() => {
    console.log('Prisma connected successfully!');
    process.exit(0);
}).catch(e => {
    console.error('Prisma connection failed:', e);
    process.exit(1);
});

