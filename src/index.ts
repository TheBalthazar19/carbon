import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const app = new Hono();
const prisma = new PrismaClient();

// Student schema validation
const studentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  aadharNumber: z.string().length(12, "Aadhar must be 12 digits"),
});

const professorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  seniority: z.enum(["JUNIOR", "SENIOR", "ASSOCIATE", "HEAD"]),
  aadharNumber: z.string().length(12, "Aadhar must be 12 digits"),
});

// Utility: Error Handler
const handleErrors = (c: any, error: any) => {
  console.error(error);
  return c.json({ error: error.message || "Internal Server Error" }, 500);
};

// Utility: Pagination
const paginate = (query: any) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  return { skip, take: limit };
};

// GET /students (with pagination)
app.get("/students", async (c) => {
  try {
    const { skip, take } = paginate(c.req.query());
    const students = await prisma.student.findMany({ skip, take });
    return c.json(students);
  } catch (error) {
    return handleErrors(c, error);
  }
});

// GET /students/enriched (with pagination)
app.get("/students/enriched", async (c) => {
  try {
    const { skip, take } = paginate(c.req.query());
    const students = await prisma.student.findMany({
      include: { proctor: true },
      skip,
      take,
    });
    return c.json(students);
  } catch (error) {
    return handleErrors(c, error);
  }
});

// POST /students
app.post("/students", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = studentSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.errors }, 400);

    const student = await prisma.student.create({ data: parsed.data });
    return c.json(student, 201);
  } catch (error) {
    return handleErrors(c, error);
  }
});

// POST /professors
app.post("/professors", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = professorSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.errors }, 400);

    const professor = await prisma.professor.create({ data: parsed.data });
    return c.json(professor, 201);
  } catch (error) {
    return handleErrors(c, error);
  }
});

// PATCH /students/:studentId
app.patch("/students/:studentId", async (c) => {
  try {
    const { studentId } = c.req.param();
    const body = await c.req.json();

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: body,
    });

    return c.json(updatedStudent);
  } catch (error) {
    return handleErrors(c, error);
  }
});

// PATCH /professors/:professorId
app.patch("/professors/:professorId", async (c) => {
  try {
    const { professorId } = c.req.param();
    const body = await c.req.json();

    const updatedProfessor = await prisma.professor.update({
      where: { id: professorId },
      data: body,
    });

    return c.json(updatedProfessor);
  } catch (error) {
    return handleErrors(c, error);
  }
});

// DELETE /students/:studentId
app.delete("/students/:studentId", async (c) => {
  try {
    const { studentId } = c.req.param();
    await prisma.student.delete({ where: { id: studentId } });
    return c.json({ message: "Student deleted" });
  } catch (error) {
    return handleErrors(c, error);
  }
});

// DELETE /professors/:professorId
app.delete("/professors/:professorId", async (c) => {
  try {
    const { professorId } = c.req.param();
    await prisma.professor.delete({ where: { id: professorId } });
    return c.json({ message: "Professor deleted" });
  } catch (error) {
    return handleErrors(c, error);
  }
});

// POST /professors/:professorId/proctorships
app.post("/professors/:professorId/proctorships", async (c) => {
  try {
    const { professorId } = c.req.param();
    const { studentId } = await c.req.json();

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { proctorId: professorId },
    });

    return c.json(updatedStudent);
  } catch (error) {
    return handleErrors(c, error);
  }
});

// GET /students/:studentId/library-membership
app.get("/students/:studentId/library-membership", async (c) => {
  try {
    const { studentId } = c.req.param();
    const membership = await prisma.libraryMembership.findUnique({
      where: { studentId },
    });

    if (!membership) return c.json({ error: "Not found" }, 404);
    return c.json(membership);
  } catch (error) {
    return handleErrors(c, error);
  }
});

// POST /students/:studentId/library-membership
app.post("/students/:studentId/library-membership", async (c) => {
  try {
    const { studentId } = c.req.param();
    const { issueDate, expiryDate } = await c.req.json();

    const membership = await prisma.libraryMembership.create({
      data: { studentId, issueDate, expiryDate },
    });

    return c.json(membership, 201);
  } catch (error) {
    return handleErrors(c, error);
  }
});

// PATCH /students/:studentId/library-membership
app.patch("/students/:studentId/library-membership", async (c) => {
  try {
    const { studentId } = c.req.param();
    const body = await c.req.json();

    const updatedMembership = await prisma.libraryMembership.update({
      where: { studentId },
      data: body,
    });

    return c.json(updatedMembership);
  } catch (error) {
    return handleErrors(c, error);
  }
});

// DELETE /students/:studentId/library-membership
app.delete("/students/:studentId/library-membership", async (c) => {
  try {
    const { studentId } = c.req.param();
    await prisma.libraryMembership.delete({ where: { studentId } });
    return c.json({ message: "Library membership deleted" });
  } catch (error) {
    return handleErrors(c, error);
  }
});

serve({ fetch: app.fetch, port: 3000 });

console.log("Server running on http://localhost:3000");
