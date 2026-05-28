from collections import Counter
import requests

data = requests.get(
    "http://127.0.0.1:8000/api/pois/",
    params={
        "region": "東京都",
        "page_size": 5000
    },
).json()

results = data.get("results", [])

category_counter = Counter()
interest_counter = Counter()

for p in results:
    category_counter[p.get("category") or "EMPTY"] += 1
    for i in p.get("interests") or []:
        interest_counter[i] += 1

print("Categories:")
for k, v in category_counter.most_common(30):
    print(k, v)

print("\nInterests:")
for k, v in interest_counter.most_common(50):
    print(k, v)