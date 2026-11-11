#!/usr/bin/env python3
"""Identify independently verified payouts to the public Toyol Base wallet.

Reads only public SwarmMemo task records. Never signs a wallet transaction.
Notify via own repo issue once per verified transaction.
"""
import json
import os
import re
import sys
import urllib.request

REPO = "ilhamraduanbis-source/toyol-digital"
ISSUE = 5
ADDRESS = "0xaC57AD3c3F233E5865c3cd652f67Ffc82a7Af431"
TASKS = {
    "SwarmMemo API QA": "481fbfae3a58712dfef55751aa81f209",
    "SwarmMemo public-data brief": "09c1f608bbe17d729f034c1dae5b0a04",
}
TX_RE = re.compile(r"0x[0-9a-fA-F]{64}")
MARKER_RE = re.compile(r"TOYOL-PAYOUT-TX\s+(0x[0-9a-fA-F]{64})")

def read_json(url, token=None):
    headers = {"Accept": "application/json", "User-Agent": "ToyolPayoutEvidence/1.0"}
    if token:
        headers["Authorization"] = "Bearer " + token
        headers["X-GitHub-Api-Version"] = "2022-11-28"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=18) as response:
        if response.status != 200:
            raise RuntimeError("Unexpected source HTTP response")
        return json.load(response)

def paid_to_toyol():
    receipts = []
    for label, taskid in TASKS.items():
        payload = read_json("https://swarmmemo.com/api/work/" + taskid)
        if not payload.get("ok"):
            raise RuntimeError("Unverified task API response")
        task = payload.get("data", {}).get("work") or {}
        if task.get("id") != taskid:
            raise RuntimeError("Unexpected source work identity")
        for result in task.get("results") or []:
            payout = (result.get("money") or {}).get("usdc") or {}
            if payout.get("state") != "paid":
                continue
            if str(payout.get("pay_to") or "").lower() != ADDRESS.lower():
                continue
            tx = str(payout.get("tx_hash") or "")
            if not TX_RE.fullmatch(tx):
                continue
            try:
                amount = float(payout.get("amount"))
            except (TypeError, ValueError):
                continue
            if not (0 < amount <= 100):
                continue
            receipts.append({"task": label, "amount": amount, "tx": tx,
                             "receipt": str(result.get("result_id") or ""),
                             "task_id": taskid})
    return receipts

def notify(receipts):
    token = os.getenv("GITHUB_TOKEN")
    if not token or os.getenv("GITHUB_REPOSITORY") != REPO:
        print("No issue write token: read-only payout scan", flush=True)
        return
    url = "https://api.github.com/repos/" + REPO + "/issues/" + str(ISSUE) + "/comments"
    existing = read_json(url + "?per_page=100", token)
    announced = set()
    for comment in existing:
        if (comment.get("user") or {}).get("login") in ("github-actions[bot]", "ilhamraduanbis-source"):
            announced.update(x.lower() for x in MARKER_RE.findall(str(comment.get("body") or "")))
    for payout in receipts:
        if payout["tx"].lower() in announced:
            continue
        message = (
            "## Toyol — verified external USDC settlement\n\n"
            f"- Task: {payout['task']}\n"
            f"- Amount: {payout['amount']:.6f} USDC on Base\n"
            f"- Receiving public wallet: {ADDRESS}\n"
            f"- Result: https://swarmmemo.com/e/{payout['receipt']}\n"
            f"- Task: https://swarmmemo.com/work/{payout['task_id']}\n"
            f"- Transaction: https://basescan.org/tx/{payout['tx']}\n"
            f"- TOYOL-PAYOUT-TX {payout['tx']}\n\n"
            "Payment platform records this transaction as paid to the Toyol Base "
            "address. This does NOT prove a MYR or TNG cashout."
        )
        req = urllib.request.Request(
            url, data=json.dumps({"body": message}).encode("utf-8"), method="POST",
            headers={"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json",
                     "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28",
                     "User-Agent": "ToyolPayoutEvidence/1.0"}
        )
        with urllib.request.urlopen(req, timeout=18) as response:
            if response.status != 201:
                raise RuntimeError("Could not publish payout evidence")
        announced.add(payout["tx"].lower())
        print("New confirmed payout: notified owner through Toyol Issue #5.", flush=True)

def main():
    paid = paid_to_toyol()
    if not paid:
        print("No verified onchain USDC paid to Toyol on tracked tasks.", flush=True)
        return
    for record in paid:
        print(f"Paid: {record['amount']:.6f} USDC | https://basescan.org/tx/{record['tx']}", flush=True)
    notify(paid)

if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print("Payout proof temporarily unavailable: " + str(err).splitlines()[0][:130], flush=True)
        sys.exit(1)
