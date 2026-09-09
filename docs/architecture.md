# Architecture

The App Router renders the storefront shell and keeps platform access behind constrained server-side route handlers. The server resolves a public runtime from the single configured `storeId`, then calls the deployed `/v1/headless` contracts without exposing the publishable key to browser code. Bootstrap and API failures fail closed with an unavailable response; the application never substitutes synthetic products or commerce results. A rejected bootstrap promise is evicted so a transient outage can recover without restarting the Next.js process.

Cart and checkout requests use an exact method/path Route Handler allowlist, including hosted `payment-session`. It forwards the resolved publishable key, HttpOnly cart capability, JSON and caller-owned intent. Creation strips the cart capability from the response body and puts it in a SameSite=Lax cookie; production uses Secure and a `__Host-` cookie. Existing explicit cart headers remain a compatibility input. There is no new customer-session subsystem.

Bootstrap is refreshed after at most 60 seconds and may only select the operator's trusted API origin. Upstream requests forbid redirects, use a ten-second deadline and bound response bodies to 2 MiB. Mutating proxy bodies are bounded to 64 KiB with a read deadline. Foreign browser origins, unknown routes, unsupported methods and query parameters fail before dispatch. Request IDs and rate/retry diagnostics pass through; all current responses use `no-store`.

The UI dispatches hosted versus non-hosted checkout from the server's selected-method capabilities. It persists an intent across reloads, prevents simultaneous button dispatch and never interprets browser-return parameters as payment success. Hosted capture/refund initiation is not implemented in the starter. The container/Node package hosts presentation and the proxy, not the 1Ecomm backend.

Local browser tests run against a deliberately small deterministic mock server. That server is test infrastructure only and is never bundled as an application fallback. Deployed-fixture qualification remains a separate fail-closed gate.

The checkout form leaves state/province and postal-code requirements to the backend country catalog. A nonshipping checkout omits the shipping selector when the API offers no delivery options and reports no shipping-method gap. This does not implement a pickup-location chooser; the server still validates any persisted pickup choice. Digital fulfillment/download delivery is separate from omitting shipping requirements.
