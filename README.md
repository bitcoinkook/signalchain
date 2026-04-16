# signalchain
A signal diagnostic instrument. Open source, MIT license.
SignalChain
A signal diagnostic instrument
What it is
SignalChain identifies exactly where in the information chain a structure breaks down.
Every system that transmits information runs on one condition:
I(B) is defined  ⟺  A = C
Information about any variable element B only exists when a constant reference A is holding still. When information stops flowing — when a market stagnates, when a solution fails to reach the people who need it — the breakdown is always at one of four points in this chain.
SignalChain finds which one.
The four nodes
SIGNAL → MEDIUM → POTENTIAL → PHASE
SIGNAL — Is genuine information being produced at all? Is the variable element's variation reaching anyone?
MEDIUM — Is the relation between A and B intact? Is there a transmission substrate through which the signal can travel?
POTENTIAL — Is A = C being held? What energy is maintaining it, who is bearing that cost, and is it sustainable?
PHASE — Is A = C local or global? Stable in one place, or everywhere simultaneously and self-sustaining?
The chain is sequential. A broken node makes all subsequent nodes indeterminate. The diagnostic stops at the first confirmed break and names the specific intervention at that point.
What it produces
For any structure you input, SignalChain returns:
The state of each node: INTACT, BROKEN, or INDETERMINATE
The exact break point in the chain
The minimum intervention specific to that break point
A single-line chain state summary
What it does not do
This is not a general diagnostic. It does not ask who benefits from the breakdown or map the political economy of incumbency. It asks only: where in the chain does the formula first fail?
That precision is the point. Different break points require different interventions. Confusing them wastes effort.
Running it yourself
This tool calls the Anthropic API. To deploy it:
Clone this repository
Add your Anthropic API key
Deploy the React component to any hosting platform
No API key is included. None will be.
Related
The Gradient — github.com/bitcoinkook/the-gradient — diagnoses whether a structure's fixed and variable elements are correctly arranged and maps where opportunity accumulates.
SignalChain and The Gradient are complementary instruments. The Gradient identifies the inversion. SignalChain locates where in the chain the formula breaks.
License
MIT. Use it, fork it, improve it, deploy it with your own API key.
Part of
OpenProtocol — an open framework for identifying and building honest alternatives to captured structures across sectors.
