import subprocess
import json
import re
import os
import sys

# Force UTF-8 on Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

def scan_problems():
    print("====================================================")
    print("[*] DDT WORKSPACE DIAGNOSTICS & PROBLEM SCANNER")
    print("====================================================")
    print("[*] Running full TypeScript Compiler audit on codebase...")

    # Run tsc with json/readable error reporting
    cmd = ["pnpm", "exec", "tsc", "--noEmit", "--pretty", "false"]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, cwd=os.getcwd(), shell=True)
        raw_output = proc.stdout + "\n" + proc.stderr
    except Exception as e:
        print(f"[!] Failed to run tsc: {e}")
        return

    # Parse errors similar to IDE Problems view
    # Example format: src/utils/text.ts(179,35): error TS2339: Property 'escape' does not exist on type 'RegExpConstructor'.
    pattern = re.compile(r"^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s*(TS\d+):\s*(.+)$", re.MULTILINE)
    
    problems = []
    for match in pattern.finditer(raw_output):
        file_path, line, col, severity, code, message = match.groups()
        problems.append({
            "file": file_path.strip(),
            "line": int(line),
            "col": int(col),
            "severity": severity,
            "code": code,
            "message": message.strip()
        })

    print(f"\n[+] Total Problems Found: {len(problems)}")
    print("----------------------------------------------------")
    
    if not problems:
        print("🎉 CLEAN SHEET! Zero TypeScript/IDE diagnostics errors found.")
        print("====================================================")
        return

    # Group by file
    by_file = {}
    for p in problems:
        by_file.setdefault(p["file"], []).append(p)

    for file, errs in by_file.items():
        print(f"\n📄 {file} ({len(errs)} issues)")
        for err in errs[:10]: # cap display per file
            icon = "❌" if err["severity"] == "error" else "⚠️"
            print(f"  {icon} Line {err['line']}:{err['col']} [{err['code']}] {err['message']}")
        if len(errs) > 10:
            print(f"  ... and {len(errs) - 10} more issues in this file.")

    # Save report
    report_file = "problems_report.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(problems, f, indent=2)

    print("\n====================================================")
    print(f"💾 Full report saved to: {report_file}")
    print("====================================================")

if __name__ == "__main__":
    scan_problems()
