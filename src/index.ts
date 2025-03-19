import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const app = new Hono();
const prisma = new PrismaClient();

// Schema validation
const studentSchema = z.object({
  name: z.string(),
  dateOfBirth: z.string(),
  aadharNumber: z.string(),
});

const professorSchema = z.object({
  name: z.string(),
  seniority: z.enum(["JUNIOR", "SENIOR", "ASSOCIATE", "HEAD"]),
  aadharNumber: z.string(),
});

// GET /students
app.get("/students", async (c) => {
  const students = await prisma.student.findMany();
  return c.json(students);
});

// GET /students/enriched
app.get("/students/enriched", async (c) => {
  const students = await prisma.student.findMany({
    include: { proctor: true },
  });
  return c.json(students);
});

// GET /professors
app.get("/professors", async (c) => {
  const professors = await prisma.professor.findMany();
  return c.json(professors);
});

// POST /students
app.post("/students", async (c) => {
  const body = await c.req.json();
  const parsed = studentSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error }, 400);

  const student = await prisma.student.create({ data: parsed.data });
  return c.json(student, 201);
});

// POST /professors
app.post("/professors", async (c) => {
  const body = await c.req.json();
  const parsed = professorSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error }, 400);

  const professor = await prisma.professor.create({ data: parsed.data });
  return c.json(professor, 201);
});

// GET /professors/:professorId/proctorships
app.get("/professors/:professorId/proctorships", async (c) => {
  const { professorId } = c.req.param();
  const students = await prisma.student.findMany({
    where: { proctorId: professorId },
  });
  return c.json(students);
});

// PATCH /students/:studentId
app.patch("/students/:studentId", async (c) => {
  const { studentId } = c.req.param();
  const body = await c.req.json();
  const updatedStudent = await prisma.student.update({
    where: { id: studentId },
    data: body,
  });
  return c.json(updatedStudent);
});

// PATCH /professors/:professorId
app.patch("/professors/:professorId", async (c) => {
  const { professorId } = c.req.param();
  const body = await c.req.json();
  const updatedProfessor = await prisma.professor.update({
    where: { id: professorId },
    data: body,
  });
  return c.json(updatedProfessor);
});

// DELETE /students/:studentId
app.delete("/students/:studentId", async (c) => {
  const { studentId } = c.req.param();
  await prisma.student.delete({ where: { id: studentId } });
  return c.json({ message: "Student deleted" });
});

// DELETE /professors/:professorId
app.delete("/professors/:professorId", async (c) => {
  const { professorId } = c.req.param();
  await prisma.professor.delete({ where: { id: professorId } });
  return c.json({ message: "Professor deleted" });
});

// POST /professors/:professorId/proctorships
app.post("/professors/:professorId/proctorships", async (c) => {
  const { professorId } = c.req.param();
  const { studentId } = await c.req.json();

  const updatedStudent = await prisma.student.update({
    where: { id: studentId },
    data: { proctorId: professorId },
  });

  return c.json(updatedStudent);
});

// GET /students/:studentId/library-membership
app.get("/students/:studentId/library-membership", async (c) => {
  const { studentId } = c.req.param();
  const membership = await prisma.libraryMembership.findUnique({
    where: { studentId },
  });

  if (!membership) return c.json({ error: "Not found" }, 404);
  return c.json(membership);
});

// POST /students/:studentId/library-membership
app.post("/students/:studentId/library-membership", async (c) => {
  const { studentId } = c.req.param();
  const { issueDate, expiryDate } = await c.req.json();

  const membership = await prisma.libraryMembership.create({
    data: { studentId, issueDate, expiryDate },
  });

  return c.json(membership, 201);
});

// PATCH /students/:studentId/library-membership
app.patch("/students/:studentId/library-membership", async (c) => {
  const { studentId } = c.req.param();
  const body = await c.req.json();

  const updatedMembership = await prisma.libraryMembership.update({
    where: { studentId },
    data: body,
  });

  return c.json(updatedMembership);
});

// DELETE /students/:studentId/library-membership
app.delete("/students/:studentId/library-membership", async (c) => {
  const { studentId } = c.req.param();
  await prisma.libraryMembership.delete({ where: { studentId } });
  return c.json({ message: "Library membership deleted" });
});

serve({ fetch: app.fetch, port: 3000 });

console.log("Server running on http://localhost:3000");
