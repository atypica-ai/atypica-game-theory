const { PrismaClient } = require("../src/prisma/client");

const prisma = new PrismaClient();

async function setInterviewInstruction() {
  while (true) {
    const interviews = await prisma.analystInterview.findMany({
      where: {
        OR: [
          { instruction: null },
          // { instruction: "" }
        ],
      },
      orderBy: {
        id: "desc",
      },
      take: 100,
    });
    if (!interviews.length) break;
    const promises = [];
    for (const interview of interviews) {
      const promise = new Promise(async (resolve, reject) => {
        try {
          let instruction = "";
          const promptText = interview.interviewerPrompt || "";
          const match1 = promptText.match(/<instruction>([\s\S]*?)<\/instruction>/);
          const match2 = promptText.match(/<具体指导>([\s\S]*?)<\/具体指导>/);
          const match3 = promptText.match(/<访谈要求>([\s\S]*?)<\/访谈要求>/);
          if (match1 && match1[1]) {
            instruction = match1[1].trim();
          } else if (match2 && match2[1]) {
            instruction = match2[1].trim();
          } else if (match3 && match3[1]) {
            instruction = match3[1].trim();
          }
          // console.log("promptText", promptText);
          await prisma.analystInterview.update({
            where: { id: interview.id },
            data: { instruction: instruction.trim() },
          });
          console.log("instruction", instruction);
          console.log(`Interview ${interview.id} instruction set successfully`);
          resolve(null);
        } catch (error) {
          console.log(`Error setting instruction on interview ${interview.id}: ${error.message}`);
          reject(null);
        }
      });
      promises.push(promise);
    }
    await Promise.all(promises);
  }
}

setInterviewInstruction();
