const { PrismaClient } = require("../src/prisma/client");
const { createHash } = require("crypto");

const prisma = new PrismaClient();

async function main() {
  const reports = await prisma.analystReport.findMany({
    select: { id: true, token: true },
    where: {
      onePageHtml: { contains: "/api/imagegen" },
      createdAt: { gte: new Date("2025-05-20") },
    },
  });

  for (const { id, token } of reports) {
    const report = await prisma.analystReport.findUniqueOrThrow({ where: { id } });
    const imgTagRegex = /<img([^>]*?)src="(\/api\/imagegen\/[^"]*)"([^>]*?)>/g;
    const matches = [...report.onePageHtml.matchAll(imgTagRegex)];
    console.log(id, token);
    await Promise.all(
      matches.map(async ([match, beforeSrc, src, afterSrc], index) => {
        const urlParts = src.split("/");
        const prompt = urlParts[urlParts.length - 1].split("?")[0];
        const urlObj = new URL(src, "http://localhost:3000");
        const ratio = urlObj.searchParams.get("ratio") || "";
        const promptHash = createHash("sha256")
          .update(JSON.stringify({ prompt, ratio }))
          .digest("hex")
          .substring(0, 40);
        const existingImage = await prisma.imageGeneration.findUnique({ where: { promptHash } });
        if (!existingImage) {
          console.log("> missing", token, prompt);
        }
      }),
    );
  }
}

main();

/*
# Array of URLs
urls=(
    "https://atypica.musedam.cc/artifacts/report/jnk3TatEvvXfKLU2/raw?regenerateImages=1"
    "https://atypica.musedam.cc/artifacts/report/63Cma4YtJCGM3RrN/raw?regenerateImages=1"
    "https://atypica.musedam.cc/artifacts/report/nFa9dkieTjJ4mwkd/raw?regenerateImages=1"
)

# Function to access URL
access_url() {
    local url=$1
    echo "$(date): Accessing $url"
    open "$url" > /dev/null
    if [ $? -eq 0 ]; then
        echo "$(date): Successfully accessed $url"
    else
        echo "$(date): Failed to access $url"
    fi
}

# Main loop
while true; do
    for url in "${urls[@]}"; do
        access_url "$url"
        echo "Waiting 5 seconds..."
        sleep 5
    done
done
*/
