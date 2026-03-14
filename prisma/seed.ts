import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { faker } from '@faker-js/faker';
import { Priority, AssetType, AssetStatus, TicketStatus, TicketSource, ImpactLevel, UrgencyLevel } from '@prisma/client';

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data (optional)
  await prisma.automationRule.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.knowledgeBaseArticle.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.sLA.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Cleared all tables');

  // Create users
  const users = [];
  for (let i = 0; i < 20; i++) {
    const role = i === 0 ? 'ADMIN' : i < 5 ? 'AGENT' : 'END_USER';
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        name: faker.person.fullName(),
        role,
        department: faker.helpers.arrayElement(['IT', 'HR', 'Finance', 'Operations', 'Sales', 'Marketing']),
        externalId: faker.string.uuid(),
        avatarUrl: faker.image.avatar(),
      },
    });
    users.push(user);
    console.log(`Created user ${user.name} (${user.role})`);
  }

  // Create SLAs
  const slas = [];
  const slaPriorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
  for (const priorityStr of slaPriorities) {
    const priority = priorityStr as Priority;
    const sla = await prisma.sLA.create({
      data: {
        name: `${priority} Priority SLA`,
        description: `Service Level Agreement for ${priority.toLowerCase()} priority tickets`,
        priority,
        responseTime: priority === 'CRITICAL' ? 60 : priority === 'HIGH' ? 120 : priority === 'MEDIUM' ? 240 : 480,
        resolutionTime: priority === 'CRITICAL' ? 240 : priority === 'HIGH' ? 480 : priority === 'MEDIUM' ? 1440 : 2880,
        escalationLevels: 3,
        isActive: true,
      },
    });
    slas.push(sla);
    console.log(`Created SLA ${sla.name}`);
  }

  // Create assets
  const assets = [];
  const assetTypes = [AssetType.LAPTOP, AssetType.DESKTOP, AssetType.MONITOR, AssetType.PHONE, AssetType.PRINTER, AssetType.SOFTWARE, AssetType.SERVER, AssetType.NETWORK, AssetType.OTHER];
  const assetStatuses = [AssetStatus.ACTIVE, AssetStatus.INACTIVE, AssetStatus.MAINTENANCE, AssetStatus.RETIRED, AssetStatus.LOST];
  for (let i = 0; i < 15; i++) {
    const asset = await prisma.asset.create({
      data: {
        name: `${faker.commerce.productName()} ${faker.helpers.arrayElement(['Laptop', 'Desktop', 'Monitor', 'Phone'])}`,
        type: faker.helpers.arrayElement(assetTypes),
        serialNumber: faker.string.alphanumeric(10).toUpperCase(),
        location: faker.location.streetAddress(),
        status: faker.helpers.arrayElement(assetStatuses),
        purchaseDate: faker.date.past({ years: 3 }),
        warrantyEnd: faker.date.future({ years: 2 }),
        licenseKey: faker.string.alphanumeric(20),
        notes: faker.lorem.sentence(),
        userId: faker.helpers.arrayElement(users.filter(u => u.role === 'END_USER')).id,
      },
    });
    assets.push(asset);
    console.log(`Created asset ${asset.name}`);
  }

  // Create tickets
  const tickets = [];
  const ticketStatuses = [TicketStatus.NEW, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED];
  const priorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL];
  const sources = [TicketSource.PORTAL, TicketSource.EMAIL, TicketSource.PHONE, TicketSource.CHAT];
  const impactLevels = [ImpactLevel.LOW, ImpactLevel.MEDIUM, ImpactLevel.HIGH, ImpactLevel.CRITICAL];
  const urgencyLevels = [UrgencyLevel.LOW, UrgencyLevel.MEDIUM, UrgencyLevel.HIGH, UrgencyLevel.CRITICAL];
  
  for (let i = 0; i < 30; i++) {
    const user = faker.helpers.arrayElement(users.filter(u => u.role === 'END_USER'));
    const assignedTo = faker.helpers.arrayElement([...users.filter(u => u.role === 'AGENT'), null]);
    const asset = faker.helpers.arrayElement([...assets, null]);
    const sla = faker.helpers.arrayElement(slas);
    const status = faker.helpers.arrayElement(ticketStatuses);
    const priority = faker.helpers.arrayElement(priorities);
    const ticket = await prisma.ticket.create({
      data: {
        title: faker.hacker.phrase(),
        description: faker.lorem.paragraphs(2),
        status,
        priority,
        category: faker.helpers.arrayElement(['Hardware', 'Software', 'Network', 'Access', 'Other']),
        tags: JSON.stringify(faker.helpers.arrayElements(['urgent', 'escalated', 'customer', 'internal'], { min: 1, max: 3 })),
        userId: user.id,
        assignedToId: assignedTo?.id || null,
        assetId: asset?.id || null,
        slaId: sla.id,
        firstResponseAt: status !== 'NEW' ? faker.date.recent() : null,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? faker.date.recent() : null,
        closedAt: status === 'CLOSED' ? faker.date.recent() : null,
        source: faker.helpers.arrayElement(sources),
        impact: faker.helpers.arrayElement(impactLevels),
        urgency: faker.helpers.arrayElement(urgencyLevels),
        calculatedPriority: priority,
      },
    });
    tickets.push(ticket);
    console.log(`Created ticket ${ticket.title} (${ticket.status})`);
  }

  // Create comments
  for (let i = 0; i < 50; i++) {
    const ticket = faker.helpers.arrayElement(tickets);
    const user = faker.helpers.arrayElement(users);
    await prisma.comment.create({
      data: {
        content: faker.lorem.paragraph(),
        ticketId: ticket.id,
        userId: user.id,
        isInternal: faker.datatype.boolean(),
      },
    });
  }
  console.log('Created 50 comments');

  // Create knowledge base articles
  const categories = ['Security', 'Networking', 'Hardware', 'Software', 'General'];
  for (let i = 0; i < 10; i++) {
    await prisma.knowledgeBaseArticle.create({
      data: {
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraphs(5),
        category: faker.helpers.arrayElement(categories),
        tags: JSON.stringify(faker.helpers.arrayElements(['guide', 'tutorial', 'faq', 'best-practice'], { min: 1, max: 3 })),
        isPublished: faker.datatype.boolean(),
        viewCount: faker.number.int({ min: 0, max: 1000 }),
        helpfulCount: faker.number.int({ min: 0, max: 100 }),
        notHelpfulCount: faker.number.int({ min: 0, max: 10 }),
        authorId: faker.helpers.arrayElement(users.filter(u => u.role === 'AGENT' || u.role === 'ADMIN')).id,
      },
    });
  }
  console.log('Created 10 knowledge base articles');

  // Create automation rules
  const triggers = ['ticket.created', 'ticket.updated', 'ticket.assigned', 'sla.breach'];
  for (let i = 0; i < 5; i++) {
    await prisma.automationRule.create({
      data: {
        name: faker.lorem.words(3),
        description: faker.lorem.sentence(),
        trigger: faker.helpers.arrayElement(triggers),
        condition: JSON.stringify({ field: 'priority', operator: 'equals', value: 'HIGH' }),
        action: JSON.stringify({ type: 'assign', value: 'agent' }),
        isActive: faker.datatype.boolean(),
      },
    });
  }
  console.log('Created 5 automation rules');

  console.log('✅ Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });