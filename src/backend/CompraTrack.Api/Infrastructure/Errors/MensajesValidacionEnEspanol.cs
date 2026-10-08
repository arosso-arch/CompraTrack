using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.ModelBinding.Metadata;

namespace CompraTrack.Api.Infrastructure.Errors;

/// <summary>
/// Reemplaza los mensajes de validación por defecto (en inglés) por mensajes en español.
/// Solo actúa sobre los atributos que no definen su propio ErrorMessage.
/// </summary>
public sealed class MensajesValidacionEnEspanol : IValidationMetadataProvider
{
    public void CreateValidationMetadata(ValidationMetadataProviderContext context)
    {
        foreach (var atributo in context.ValidationMetadata.ValidatorMetadata.OfType<ValidationAttribute>())
        {
            // EmailAddressAttribute trae un mensaje por defecto ya cargado en ErrorMessage, así que se reemplaza siempre.
            var tieneMensajePropio = atributo is not EmailAddressAttribute
                                     && (atributo.ErrorMessage is not null || atributo.ErrorMessageResourceName is not null);
            if (tieneMensajePropio)
                continue;

            atributo.ErrorMessage = atributo switch
            {
                RequiredAttribute => "El campo {0} es obligatorio.",
                StringLengthAttribute { MinimumLength: > 0 } => "El campo {0} debe tener entre {2} y {1} caracteres.",
                StringLengthAttribute => "El campo {0} admite como máximo {1} caracteres.",
                RangeAttribute => "El campo {0} debe estar entre {1} y {2}.",
                EmailAddressAttribute => "El campo {0} no es un email válido.",
                MinLengthAttribute => "El campo {0} debe tener al menos {1} elemento(s).",
                RegularExpressionAttribute => "El campo {0} tiene un formato inválido.",
                _ => null
            };
        }
    }
}
