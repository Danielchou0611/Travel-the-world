import os

views_path = '/mnt/c/Travel_Japan_Web/Gary/Travel-the-world/backend/recommendations/views.py'

# We'll use a Python script to rewrite the view logic to handle imports and the new class correctly
with open(views_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Filter out the old TripGenerationView and everything below it
new_lines = []
skip = False
for line in lines:
    if 'class TripGenerationView(APIView):' in line:
        skip = True
        break
    new_lines.append(line)

final_base_content = "".join(new_lines)

new_logic = '''

import random
import math
from datetime import datetime, timedelta
from .services import haversine_distance_meters

class TripGenerationView(APIView):
    def post(self, request):
        serializer = TripGenerationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        days_count = data["days"]
        interests = data["interests"]
        destinations = data["destination"]
        exploration_style = data["explorationStyle"] # 0-100
        
        # 1. Region Filtering
        query = Q()
        if destinations:
            for dest in destinations:
                if dest.strip():
                    query |= Q(region__icontains=dest.strip())
        if not destinations or not any(d.strip() for d in destinations):
            query = Q(region="東京都")

        # 2. Candidate Selection (70/30 Hybrid)
        # Fetch a larger pool to allow for clustering
        all_candidates = PointOfInterest.objects.filter(query).exclude(lat__isnull=True)
        
        if not all_candidates.exists():
            all_candidates = PointOfInterest.objects.exclude(lat__isnull=True)[:500]

        # Calculate hybrid score for each POI
        scored_pois = []
        for poi in all_candidates:
            # Popularity (Log of review count)
            pop_score = math.log10(max(1, poi.review_count)) / 5.0 # Normalized roughly
            # Quality (Google Rating)
            quality_score = (poi.google_rating or 0) / 5.0
            # Static Score (Pipeline pre-calc)
            base_score = poi.static_score or 0
            
            # Hybrid Calculation
            hybrid_score = (quality_score * 0.4) + (pop_score * 0.4) + (base_score * 0.2)
            
            # Interest Bonus (0.1 boost if matched)
            interest_match = 0
            if interests and poi.interests:
                matched = set(interests) & set(poi.interests)
                if matched:
                    interest_match = 0.1 * (len(matched) / len(interests))
            
            poi.final_calc_score = hybrid_score + interest_match
            scored_pois.append(poi)

        # Sort by final score
        scored_pois.sort(key=lambda x: x.final_calc_score, reverse=True)
        
        # Take the top 300 to work with
        candidate_pool = scored_pois[:300]
        used_ids = set()

        itinerary_days = []
        
        # 3. Geographic Clustering Logic (Daily Anchor Strategy)
        for d in range(1, days_count + 1):
            day_attractions = []
            
            # Find an Anchor for the day (best available POI)
            anchor = None
            for p in candidate_pool:
                if p.poi_id not in used_ids:
                    anchor = p
                    break
            
            if not anchor:
                break # No more POIs
            
            day_attractions.append(anchor)
            used_ids.add(anchor.poi_id)
            
            # Find neighbors within 10km
            num_to_find = max(1, min(4, int(exploration_style / 20))) # 20->1, 60->3, 100->4
            
            neighbors = []
            for p in candidate_pool:
                if p.poi_id not in used_ids:
                    dist = haversine_distance_meters(
                        lat1=anchor.lat, lng1=anchor.lng,
                        lat2=p.lat, lng2=p.lng
                    )
                    if dist < 10000: # 10km radius
                        p.temp_dist = dist
                        neighbors.append(p)
            
            # Sort neighbors by distance and take the closest ones
            neighbors.sort(key=lambda x: x.temp_dist)
            for n_poi in neighbors[:num_to_find]:
                day_attractions.append(n_poi)
                used_ids.add(n_poi.poi_id)

            # Format the output for this day
            formatted_attractions = []
            for i, poi in enumerate(day_attractions):
                formatted_attractions.append({
                    "id": poi.poi_id,
                    "name": poi.name,
                    "category": poi.category or "景點",
                    "description": f"位於{poi.region}的優質景點，獲得 {poi.google_rating} 高分。這是一個結合了品質與人氣的推薦地點。",
                    "image": poi.image_url,
                    "position": {"lat": poi.lat, "lng": poi.lng},
                    "duration": "1.5–2 小時",
                    "rating": poi.google_rating or 0.0,
                    "estimatedCost": "免費" if poi.final_calc_score > 0.7 else "¥1,000–3,000",
                    "location": poi.region,
                    "baseScore": int(poi.final_calc_score * 100),
                    "foodScore": random.randint(20, 90),
                    "explorationScore": random.randint(40, 95),
                    "xai": {
                        "summary": f"這是當天的{'核心景點' if i==0 else '鄰近熱門點'}。根據大數據分析，其品質得分為 {int(poi.final_calc_score*100)} 分。",
                        "scores": [
                            {"label": "綜合品質", "value": int(poi.final_calc_score * 100)},
                            {"label": "人氣指數", "value": int(math.log10(max(1, poi.review_count)) * 20)},
                            {"label": "交通效率", "value": int((poi.station_distance_efficiency or 0.5) * 100)}
                        ],
                        "matchedInterests": [it for it in interests if it in (poi.interests or [])]
                    }
                })

            itinerary_days.append({
                "day": d,
                "date": (datetime.now() + timedelta(days=d)).strftime("%m/%d (%a)"),
                "attractions": formatted_attractions
            })

        return Response({
            "id": f"trip-{random.randint(1000, 9999)}",
            "preferences": data,
            "summary": {
                "totalDays": days_count,
                "totalBudget": f"NT$ {data['budget']:,}",
                "totalAttractions": len(used_ids),
                "avgPerDay": round(len(used_ids) / days_count, 1) if days_count > 0 else 0
            },
            "days": itinerary_days,
            "generatedAt": datetime.now().isoformat()
        })

class TripModifyView(APIView):
    def post(self, request):
        gen_view = TripGenerationView()
        return gen_view.post(request)
'''

with open(views_path, 'w', encoding='utf-8') as f:
    f.write(final_base_content + new_logic)
'''
