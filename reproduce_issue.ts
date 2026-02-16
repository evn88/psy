
import { z } from "zod";

try {
  console.log("Checking z.email existence...");
  // @ts-ignore - to avoid build error if it doesn't exist, we want runtime check
  if (typeof z.email === 'function') {
    console.log("z.email exists!");
  } else {
    console.log("z.email does NOT exist.");
  }

  const schema = z.object({
    name: z.string(),
  });

  const result = schema.safeParse({});
  if (!result.success) {
    console.log("Error keys:", Object.keys(result.error));
    // @ts-ignore
    if (result.error.errors) {
      console.log("result.error.errors exists");
    } else {
      console.log("result.error.errors does NOT exist");
    }
    // @ts-ignore
    if (result.error.issues) {
      console.log("result.error.issues exists");
    }
  }
} catch (e) {
  console.error(e);
}
