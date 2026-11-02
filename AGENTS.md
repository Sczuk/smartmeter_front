<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Browser never calls backends: all backend calls go through server functions in `src/lib/api.functions.ts`, which use `src/lib/api.server.ts` (Bearer from httpOnly cookies, one refresh retry on 401). Why: tokens stay server-side.
- Mock backends (`src/lib/mock.server.ts`) are used when `USE_MOCKS=true` or `REGISTER_API_URL` is unset. Why: real backends are not reachable from the preview.
- Backend errors cross the RPC boundary as `HTTP_<status>` / `UNAUTHENTICATED` messages, mapped to copy in `src/lib/errors.ts`. Why: backend has no standard error body.
- Pure formatting/domain helpers live in `src/lib/format.ts` and `src/lib/devices.ts` and are covered by `src/test/domain.test.ts`.
- Protected pages live under the `_authed` pathless layout, which checks the session cookie in `beforeLoad`.
