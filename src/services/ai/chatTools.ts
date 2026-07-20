import Groq from "groq-sdk";

export const chatTools: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_jobs",
      description:
        "Search and filter active job listings on TalentBridge. Use this whenever the user wants to find or browse jobs.",
      parameters: {
        type: "object",
        properties: {
          search: {
            type: "string",
            description:
              "Free text search across job title, company, and skills",
          },
          category: {
            type: "string",
            description: "e.g. Engineering, Design, Marketing",
          },
          type: {
            type: "string",
            enum: ["full-time", "part-time", "contract", "internship"],
          },
          locationType: {
            type: "string",
            enum: ["on-site", "remote", "hybrid"],
          },
          location: { type: "string" },
          minSalary: { type: "number" },
          maxSalary: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_job_details",
      description:
        "Get full details for one specific job posting by its ID. Use this after search_jobs returns a job the user wants to know more about.",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string", description: "The job's MongoDB ObjectId" },
        },
        required: ["jobId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_saved_jobs",
      description: "Get the current user's saved/bookmarked jobs.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_applications",
      description:
        "Get the current user's job applications and their current status.",
      parameters: { type: "object", properties: {} },
    },
  },
];
