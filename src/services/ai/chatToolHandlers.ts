import { getJobs, getJobById } from "../job.service";
import { getSavedJobs } from "../saved-job.service";
import { getMyApplications } from "../application.service";
import { JobQueryInput } from "../../validators/job.schema";

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  seekerId: string,
): Promise<unknown> {
  try {
    switch (name) {
      case "search_jobs": {
        const query = { ...args, limit: 5 } as JobQueryInput;
        const result = await getJobs(query, { restrictActive: true });
        return result.jobs.map((j) => ({
          id: j._id,
          title: j.title,
          company: j.company.name,
          location: j.location,
          type: j.type,
          salaryMin: j.salaryMin,
          salaryMax: j.salaryMax,
        }));
      }
      case "get_job_details": {
        const jobId = args.jobId as string;
        const job = await getJobById(jobId, undefined);
        return {
          id: job._id,
          title: job.title,
          company: job.company.name,
          description: job.description,
          requirements: job.requirements,
          skills: job.skills,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          location: job.location,
          type: job.type,
        };
      }
      case "get_saved_jobs": {
        const result = await getSavedJobs(seekerId, 1, 10);
        return result.jobs.map((j) => ({
          id: j._id,
          title: j.title,
          company: j.company.name,
        }));
      }
      case "get_my_applications": {
        const result = await getMyApplications(seekerId, 1, 10);
        return result.applications.map((a) => ({
          jobTitle: a.job?.title ?? "Unknown",
          company: a.job?.company.name ?? "Unknown",
          status: a.status,
          appliedAt: a.createdAt,
        }));
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Tool execution failed",
    };
  }
}
