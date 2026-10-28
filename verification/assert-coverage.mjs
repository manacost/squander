import fs from "node:fs";

const minimum = 90;
const summary_path = "coverage/coverage-summary.json";
const requested_files = process.argv.slice(2);

if (!fs.existsSync(summary_path)) {
  console.error(`Missing ${summary_path}; run a coverage command first.`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summary_path, "utf8"));
const files = requested_files.length === 0 ? Object.keys(summary).filter((file) => file !== "total") : requested_files.map((file) => {
  const absolute = file.startsWith("/") ? file : `${process.cwd()}/${file}`;
  return absolute;
});
const failures = [];

for (const file of files) {
  const report = summary[file];
  if (!report) {
    failures.push(`${file}: missing from coverage report`);
    continue;
  }
  for (const metric of ["statements", "branches", "functions", "lines"]) {
    if (report[metric].pct <= minimum) {
      failures.push(`${file}: ${metric} ${report[metric].pct}% is not greater than ${minimum}%`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Coverage passed for ${files.length} file${files.length === 1 ? "" : "s"}: all metrics > ${minimum}%`);
