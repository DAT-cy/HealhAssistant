package health_assistant.module.knowledge.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.knowledge.dto.KnowledgeAuditResponse;
import health_assistant.module.knowledge.dto.KnowledgeCategoryResponse;
import health_assistant.module.knowledge.dto.KnowledgeDocumentResponse;
import health_assistant.module.knowledge.dto.KnowledgeStatsResponse;
import health_assistant.module.knowledge.service.KnowledgeBaseService;
import health_assistant.utils.ClientUtils;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@Validated
@RequestMapping(ClientUtils.VERSION + "/admin/knowledge")
@Tag(name = "Admin knowledge base")
@RequiredArgsConstructor
public class AdminKnowledgeController {
    private final KnowledgeBaseService knowledgeBaseService;

    @GetMapping("/categories")
    public ResponseEntity<DefaultRes<List<KnowledgeCategoryResponse>>> categories() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, knowledgeBaseService.categories()));
    }

    @GetMapping("/stats")
    public ResponseEntity<DefaultRes<KnowledgeStatsResponse>> stats() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, knowledgeBaseService.stats()));
    }

    @GetMapping
    public ResponseEntity<DefaultRes<List<KnowledgeDocumentResponse>>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, knowledgeBaseService.list(status, q)));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DefaultRes<KnowledgeDocumentResponse>> upload(
            @RequestParam MultipartFile file,
            @RequestParam @NotBlank String title,
            @RequestParam @NotBlank String categoryCode,
            @RequestParam(required = false) String description,
            @RequestParam @NotBlank String documentType,
            @RequestParam(required = false) String sourceOrganization,
            @RequestParam(required = false) String sourceUrl,
            @RequestParam(required = false) String licenseName,
            @RequestParam(defaultValue = "false") boolean rightsConfirmed) {
        KnowledgeDocumentResponse document = knowledgeBaseService.upload(file, title, categoryCode, description,
                documentType, sourceOrganization, sourceUrl, licenseName, rightsConfirmed);
        return ResponseEntity.status(StatusCode.CREATED)
                .body(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED, document));
    }

    @PostMapping("/import/who-physical-activity")
    public ResponseEntity<DefaultRes<KnowledgeDocumentResponse>> importWhoGuideline() {
        KnowledgeDocumentResponse document = knowledgeBaseService.importWhoGuideline();
        return ResponseEntity.status(StatusCode.CREATED)
                .body(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED, document));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DefaultRes<KnowledgeDocumentResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, knowledgeBaseService.get(id)));
    }

    @GetMapping("/{id}/audit")
    public ResponseEntity<DefaultRes<List<KnowledgeAuditResponse>>> audit(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, knowledgeBaseService.audit(id)));
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<ByteArrayResource> download(@PathVariable Long id) {
        var file = knowledgeBaseService.download(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(file.filename(), StandardCharsets.UTF_8).build().toString())
                .body(new ByteArrayResource(file.bytes()));
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<DefaultRes<KnowledgeDocumentResponse>> review(
            @PathVariable Long id,
            @RequestParam @NotBlank String action,
            @RequestParam(required = false) String note) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED,
                knowledgeBaseService.review(id, action, note)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<DefaultRes<Boolean>> archive(@PathVariable Long id) {
        knowledgeBaseService.archive(id);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.DELETED, true));
    }
}
