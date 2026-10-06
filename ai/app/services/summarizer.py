from dataclasses import dataclass


@dataclass(frozen=True)
class SummarizationResult:
    implemented: bool = False
    summary: str = ""
    message: str = "Summarization is not implemented in this phase."


class Summarizer:
    def summarize(self, subject: str, body: str) -> SummarizationResult:
        return SummarizationResult()


summarizer = Summarizer()
