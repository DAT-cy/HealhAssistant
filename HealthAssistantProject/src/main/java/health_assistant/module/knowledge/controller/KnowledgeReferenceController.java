package health_assistant.module.knowledge.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.knowledge.dto.KnowledgeReferencePreview;
import health_assistant.module.knowledge.service.KnowledgeReferenceService;
import health_assistant.utils.ClientUtils;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ClientUtils.VERSION + "/knowledge")
@Tag(name = "Knowledge references")
@RequiredArgsConstructor
public class KnowledgeReferenceController {
    private final KnowledgeReferenceService referenceService;

    /** Xem trước nguồn tham khảo của lộ trình: ?documentId= (tài liệu nội bộ) hoặc ?diseaseCode= (danh mục bệnh). */
    @GetMapping("/reference")
    public ResponseEntity<DefaultRes<KnowledgeReferencePreview>> reference(
            @RequestParam(required = false) Long documentId,
            @RequestParam(required = false) String diseaseCode) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, referenceService.preview(documentId, diseaseCode)));
    }
}
