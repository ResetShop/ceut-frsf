/** Generates the HTML page for Swagger UI using CDN-hosted assets. */
export function buildSwaggerHtml(): string {
	const specUrl = '/api/openapi.json'

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<title>API Documentation</title>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.0/swagger-ui.css" integrity="sha384-3nuX7df3EaAoiqLBeyS1Ola0Gpg9ryJKVtarubwfnA1cOH8AWHUdbPSIvEqPZ9VH" crossorigin="anonymous" />
</head>
<body>
	<div id="swagger-ui"></div>
	<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.0/swagger-ui-bundle.js" integrity="sha384-7xcoc6ZKDFF7Ek627QTC3Bg/K+5Y36NJ8MWAE43D2m6+3Sh9XO3tdsfHhrS8gNIQ" crossorigin="anonymous"></script>
	<script>
		SwaggerUIBundle({ url: '${specUrl}', dom_id: '#swagger-ui' });
	</script>
</body>
</html>`
}
