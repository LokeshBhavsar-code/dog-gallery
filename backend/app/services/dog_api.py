import httpx

DOG_API_BASE = "https://dog.ceo/api"


async def fetch_all_breeds():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{DOG_API_BASE}/breeds/list/all")
        data = response.json()

        breeds = []

        for breed, subs in data["message"].items():
            if subs:
                for sub in subs:
                    breeds.append(f"{breed}-{sub}")
            else:
                breeds.append(breed)

        return sorted(breeds)


async def fetch_breed_images(breed: str):
    # handle sub-breed: hound-afghan → hound/afghan
    if "-" in breed:
        main, sub = breed.split("-")
        url = f"{DOG_API_BASE}/breed/{main}/{sub}/images"
    else:
        url = f"{DOG_API_BASE}/breed/{breed}/images"

    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        data = response.json()
        return data["message"]
