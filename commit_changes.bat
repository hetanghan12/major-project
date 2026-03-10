@echo off
git branch het-a
git checkout het-a
git add .
git commit -m "Fix shared files display on dashboard and update admin analytics with activity trend chart"
git push origin het-a > git_push_out.txt 2>&1
