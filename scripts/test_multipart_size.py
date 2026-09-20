import asyncio
import starlette.formparsers as fp
from starlette.requests import Request

# Increase limit from default 1024KB to 15MB
fp.MultiPartParser.max_part_size = 15 * 1024 * 1024

async def main():
    boundary = "WebKitFormBoundaryXYZ123"
    payload = "A" * (4 * 1024 * 1024) # 4MB field
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="image_base64"\r\n\r\n'
        f"{payload}\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")

    scope = {
        "type": "http",
        "headers": [
            (b"content-type", f"multipart/form-data; boundary={boundary}".encode("utf-8"))
        ],
        "method": "POST",
    }

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    req = Request(scope, receive)
    form = await req.form()
    print(f"SUCCESS: Form parsed field of size {len(form['image_base64']) / (1024 * 1024):.2f} MB without error!")

if __name__ == "__main__":
    asyncio.run(main())
