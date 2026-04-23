import { readFile } from 'fs/promises';
import { supabase } from '../lib/supabase.js';

let cachedBranches = null;

async function loadBranchesConfig() {
  if (cachedBranches) return cachedBranches;

  const configCandidates = [
    new URL('../config/branches.json', import.meta.url),
    new URL('../../frontend/features/marketplace/branches.json', import.meta.url),
  ];

  for (const configUrl of configCandidates) {
    try {
      const raw = await readFile(configUrl, 'utf8');
      const parsed = JSON.parse(raw);
      cachedBranches = parsed?.branches || {};
      return cachedBranches;
    } catch (error) {
      continue;
    }
  }

  throw new Error('Branch pack configuration could not be loaded');
}

export async function resolveCourseByAnyId(courseIdOrPid) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(courseIdOrPid);
  const query = supabase
    .schema('business')
    .from('courses')
    .select('id, pid, title')
    .limit(1);

  const { data, error } = isUuid
    ? await query.eq('id', courseIdOrPid).maybeSingle()
    : await query.eq('pid', String(courseIdOrPid).toUpperCase()).maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function findAccessiblePurchase(userId, courseIdOrPid) {
  const resolvedCourse = await resolveCourseByAnyId(courseIdOrPid);
  if (!resolvedCourse) {
    return { resolvedCourse: null, purchase: null };
  }

  const directPurchase = await supabase
    .schema('business')
    .from('purchases')
    .select('id, course_id')
    .eq('user_id', userId)
    .eq('course_id', resolvedCourse.id)
    .maybeSingle();

  if (directPurchase.data) {
    return { resolvedCourse, purchase: directPurchase.data };
  }

  const branches = await loadBranchesConfig();
  const parentBranchPids = Object.values(branches)
    .filter((branch) => Array.isArray(branch?.courses) && branch.courses.includes(resolvedCourse.pid))
    .map((branch) => branch.id)
    .filter(Boolean);

  if (parentBranchPids.length === 0) {
    return { resolvedCourse, purchase: null };
  }

  const { data: branchCourses } = await supabase
    .schema('business')
    .from('courses')
    .select('id, pid')
    .in('pid', parentBranchPids);

  const branchCourseIds = (branchCourses || []).map((course) => course.id).filter(Boolean);
  if (branchCourseIds.length === 0) {
    return { resolvedCourse, purchase: null };
  }

  const { data: branchPurchase } = await supabase
    .schema('business')
    .from('purchases')
    .select('id, course_id')
    .eq('user_id', userId)
    .in('course_id', branchCourseIds)
    .limit(1)
    .maybeSingle();

  return { resolvedCourse, purchase: branchPurchase || null };
}
