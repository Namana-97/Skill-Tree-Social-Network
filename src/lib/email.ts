import sendgrid from '@sendgrid/mail';

import { prisma } from '@/lib/prisma';

const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sendgrid.setApiKey(apiKey);
}

type QueueEmailArgs = {
  userId: number;
  type: string;
  subject: string;
  html: string;
};

export async function queueEmailNotification(args: QueueEmailArgs) {
  await prisma.notification.create({
    data: {
      userId: args.userId,
      type: args.type,
      channel: 'email',
      payload: {
        subject: args.subject,
        html: args.html
      }
    }
  });
}

export async function flushEmailQueue() {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    return;
  }

  const pending = await prisma.notification.findMany({
    where: {
      channel: 'email',
      status: 'pending'
    },
    include: {
      user: true
    },
    take: 50
  });

  for (const item of pending) {
    const payload = item.payload as { subject?: string; html?: string };

    try {
      await sendgrid.send({
        from: process.env.SENDGRID_FROM_EMAIL,
        to: item.user.email,
        subject: payload.subject || 'SkillForge notification',
        html: payload.html || '<p>You have a new SkillForge notification.</p>'
      });

      await prisma.notification.update({
        where: { id: item.id },
        data: {
          status: 'sent',
          sentAt: new Date()
        }
      });
    } catch (error) {
      await prisma.notification.update({
        where: { id: item.id },
        data: {
          status: 'failed'
        }
      });
      console.error('SENDGRID_ERROR', error);
    }
  }
}
